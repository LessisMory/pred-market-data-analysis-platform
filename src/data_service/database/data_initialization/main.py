import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Sequence, Set, Tuple

import psycopg2
import requests
from psycopg2.extras import execute_values

EVENTS_URL = os.environ.get(
    "GAMMA_EVENTS_URL", "https://gamma-api.polymarket.com/events"
)
SERIES_URL = os.environ.get(
    "GAMMA_SERIES_URL", "https://gamma-api.polymarket.com/series"
)


def _parse_int(value: Optional[str]) -> Optional[int]:
    """Try to parse an int from a string env var."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_positive_int(value: Optional[str], default: int) -> int:
    """Parse a positive integer from an env var, falling back safely."""
    parsed = _parse_int(value)
    if parsed is None or parsed <= 0:
        return default
    return parsed


def _is_truthy(value: Optional[str], default: bool = False) -> bool:
    """Interpret common truthy strings (e.g., '1', 'true')."""
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _log(message: str, *, error: bool = False) -> None:
    """Emit a log line with an ISO timestamp."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    prefix = "[data-init]"
    target = sys.stderr if error else sys.stdout
    print(f"{prefix} {timestamp} {message}", file=target, flush=True)


def _iter_paginated(
    session: requests.Session,
    url: str,
    *,
    base_params: Optional[Dict[str, Any]] = None,
    page_size: int,
    timeout_seconds: int,
    limit: Optional[int] = None,
) -> Iterator[List[Dict[str, Any]]]:
    """Yield API responses page by page instead of materializing the full dataset."""
    params = dict(base_params or {})
    offset = 0
    yielded = 0

    while True:
        request_params = dict(params)
        request_params["limit"] = page_size
        request_params["offset"] = offset

        response = session.get(url, params=request_params, timeout=timeout_seconds)
        response.raise_for_status()
        page = response.json()
        if not page:
            return

        response_count = len(page)
        if limit is not None:
            remaining = limit - yielded
            if remaining <= 0:
                return
            if response_count > remaining:
                page = page[:remaining]

        yield page
        yielded += len(page)
        if limit is not None and yielded >= limit:
            return

        offset += response_count
        if response_count < page_size:
            return


def iter_series_pages(
    session: requests.Session,
    *,
    limit: Optional[int],
    page_size: int,
    timeout_seconds: int,
) -> Iterator[List[Dict[str, Any]]]:
    """Stream series pages from Polymarket."""
    yield from _iter_paginated(
        session,
        SERIES_URL,
        page_size=page_size,
        timeout_seconds=timeout_seconds,
        limit=limit,
    )


def iter_event_pages(
    session: requests.Session,
    *,
    closed: str,
    tag_id: Optional[str],
    limit: Optional[int],
    page_size: int,
    timeout_seconds: int,
) -> Iterator[List[Dict[str, Any]]]:
    """Stream event pages from Polymarket."""
    params: Dict[str, Any] = {"closed": closed}
    if tag_id:
        params["tag_id"] = tag_id

    yield from _iter_paginated(
        session,
        EVENTS_URL,
        base_params=params,
        page_size=page_size,
        timeout_seconds=timeout_seconds,
        limit=limit,
    )


# ---------- Shared helpers ----------
def safe_float(value: Any) -> Optional[float]:
    """Convert numeric-like values to float, returning None on failure."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_list(value: Any) -> Optional[List[Any]]:
    """Parse JSON list strings or pass through existing lists."""
    if value is None:
        return None
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            return None
    return None


def _insert_rows(
    conn: psycopg2.extensions.connection,
    table_name: str,
    columns: Sequence[str],
    rows: Iterable[Sequence[Any]],
    *,
    batch_size: int,
    conflict_clause: Optional[str] = None,
) -> int:
    """Insert rows in small batches to cap peak memory usage."""
    sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES %s"
    if conflict_clause:
        sql = f"{sql}\n{conflict_clause}"

    batch: List[Sequence[Any]] = []
    inserted = 0
    cur = conn.cursor()

    try:
        for row in rows:
            batch.append(row)
            if len(batch) >= batch_size:
                execute_values(cur, sql, batch, page_size=batch_size)
                inserted += len(batch)
                batch.clear()

        if batch:
            execute_values(cur, sql, batch, page_size=batch_size)
            inserted += len(batch)

        conn.commit()
        return inserted
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


def _normalize_text_id(value: Any) -> Optional[str]:
    """Normalize an identifier for TEXT columns and mapping keys."""
    if value is None:
        return None
    normalized = str(value)
    return normalized or None


# ---------- Series ----------
SERIES_COLUMNS = [
    "series_id",
    "ticker",
    "slug",
    "title",
    "series_type",
    "recurrence",
    "active",
    "closed",
    "published_at",
    "updated_at",
    "start_date",
    "created_at",
]


def build_series_row(series: Dict[str, Any]) -> List[Any]:
    """Transform a Polymarket series payload into the DB shape."""
    return [
        _normalize_text_id(
            series.get("id") or series.get("series_id") or series.get("seriesId")
        ),
        series.get("ticker"),
        series.get("slug"),
        series.get("title"),
        series.get("seriesType") or series.get("series_type"),
        series.get("recurrence"),
        series.get("active"),
        series.get("closed"),
        series.get("published_at") or series.get("publishedAt"),
        series.get("updated_at") or series.get("updatedAt"),
        series.get("start_date") or series.get("startDate"),
        series.get("created_at") or series.get("createdAt"),
    ]


def build_event_to_series_map(series_page: List[Dict[str, Any]]) -> Dict[str, str]:
    """Extract the event->series mapping needed by the events API payloads."""
    event_to_series: Dict[str, str] = {}

    for series in series_page:
        series_id = _normalize_text_id(
            series.get("id") or series.get("seriesId") or series.get("series_id")
        )
        if not series_id:
            continue

        for event in series.get("events", []):
            event_id = _normalize_text_id(event.get("id"))
            if event_id:
                event_to_series[event_id] = series_id

    return event_to_series


def populate_series_page(
    conn: psycopg2.extensions.connection,
    series_page: List[Dict[str, Any]],
    *,
    batch_size: int,
) -> int:
    """Insert a single page of series rows."""
    return _insert_rows(
        conn,
        "series",
        SERIES_COLUMNS,
        (build_series_row(series) for series in series_page),
        batch_size=batch_size,
        conflict_clause="ON CONFLICT (series_id) DO NOTHING",
    )


# ---------- Events ----------
EVENT_COLUMNS = [
    "event_id",
    "series_id",
    "parent_event_id",
    "ticker",
    "slug",
    "title",
    "description",
    "resolution_source",
    "category",
    "subcategory",
    "active",
    "closed",
    "archived",
    "new",
    "featured",
    "restricted",
    "cyom",
    "enable_order_book",
    "neg_risk",
    "enable_neg_risk",
    "neg_risk_augmented",
    "automatically_active",
    "automatically_resolved",
    "creation_date",
    "create_at",
    "updated_at",
    "start_date",
    "start_time",
    "end_date",
    "closed_time",
    "finished_timestamp",
    "volume",
    "open_interest",
    "liquidity",
    "volume_24hr",
    "volume_1wk",
    "volume_1mo",
    "liquidity_amm",
    "liquidity_clob",
    "comment_count",
]


def build_event_row(event: Dict[str, Any]) -> List[Any]:
    """Transform a Polymarket event into the DB shape."""
    return [
        _normalize_text_id(event.get("id")),
        _normalize_text_id(event.get("seriesId") or event.get("series_id")),
        _normalize_text_id(event.get("parentEventId")),
        event.get("ticker"),
        event.get("slug"),
        event.get("title"),
        event.get("description"),
        event.get("resolutionSource"),
        event.get("category"),
        event.get("subcategory"),
        event.get("active"),
        event.get("closed"),
        event.get("archived"),
        event.get("new"),
        event.get("featured"),
        event.get("restricted"),
        event.get("cyom"),
        event.get("enableOrderBook"),
        event.get("negRisk"),
        event.get("enableNegRisk"),
        event.get("negRiskAugmented"),
        event.get("automaticallyActive"),
        event.get("automaticallyResolved"),
        event.get("creationDate"),
        event.get("createdAt"),
        event.get("updatedAt"),
        event.get("startDate"),
        event.get("startTime"),
        event.get("endDate"),
        event.get("closedTime"),
        event.get("finishedTimestamp"),
        safe_float(event.get("volume")),
        safe_float(event.get("openInterest")),
        safe_float(event.get("liquidity")),
        safe_float(event.get("volume24h")),
        safe_float(event.get("volume1wk")),
        safe_float(event.get("volume1mo")),
        safe_float(event.get("liquidityAmm")),
        safe_float(event.get("liquidityClob")),
        event.get("commentCount"),
    ]


def populate_events(
    conn: psycopg2.extensions.connection,
    events: List[Dict[str, Any]],
    *,
    batch_size: int,
) -> int:
    """Insert events in bounded batches."""
    return _insert_rows(
        conn,
        "events",
        EVENT_COLUMNS,
        (build_event_row(event) for event in events),
        batch_size=batch_size,
        conflict_clause="ON CONFLICT (event_id) DO NOTHING",
    )


# ---------- Markets ----------
MARKET_COLUMNS = [
    "market_id",
    "event_id",
    "condition_id",
    "slug",
    "resolution_source",
    "game_id",
    "sports_market_type",
    "question",
    "description",
    "category",
    "subcategory",
    "market_type",
    "market_maker_address",
    "outcomes",
    "clob_token_ids",
    "active",
    "closed",
    "fpmm_live",
    "ready",
    "funded",
    "approved",
    "neg_risk",
    "neg_risk_other",
    "accepting_orders",
    "holding_rewards_enabled",
    "enable_order_book",
    "comments_enabled",
    "uma_resolution_status",
    "rewards_min_size",
    "rewards_max_spread",
    "clob_rewards",
    "seconds_delay",
    "lower_bound",
    "upper_bound",
    "order_price_min_tick_size",
    "order_min_size",
    "maker_base_fee",
    "taker_base_fee",
    "spread",
    "last_trade_price",
    "best_bid",
    "best_ask",
    "fee",
    "start_date",
    "end_date",
    "created_at",
    "updated_at",
    "closed_time",
    "game_start_time",
    "event_start_time",
    "accepting_orders_timestamp",
    "liquidity",
    "liquidity_num",
    "volume",
    "volume_num",
    "volume_24h",
    "volume_1wk",
    "volume_1mo",
    "volume_1yr",
]


def _parse_uma_status(market: Dict[str, Any]) -> Any:
    status = market.get("umaResolutionStatus")
    if status is not None:
        return status
    fallback = market.get("umaResolutionStatuses")
    if isinstance(fallback, list):
        return ",".join(fallback)
    return fallback


def build_market_row(event: Dict[str, Any], market: Dict[str, Any]) -> List[Any]:
    """Transform a Polymarket market into the DB shape."""
    return [
        _normalize_text_id(market.get("id")),
        _normalize_text_id(event.get("id")),
        _normalize_text_id(market.get("conditionId")),
        market.get("slug"),
        market.get("resolutionSource"),
        _normalize_text_id(market.get("gameId")),
        market.get("sportsMarketType"),
        market.get("question"),
        market.get("description"),
        market.get("category"),
        market.get("subcategory"),
        market.get("marketType"),
        _normalize_text_id(market.get("marketMakerAddress")),
        parse_list(market.get("outcomes")),
        parse_list(market.get("clobTokenIds")),
        market.get("active"),
        market.get("closed"),
        market.get("fpmmLive"),
        market.get("ready"),
        market.get("funded"),
        market.get("approved"),
        market.get("negRisk"),
        market.get("negRiskOther"),
        market.get("acceptingOrders"),
        market.get("holdingRewardsEnabled"),
        market.get("enableOrderBook"),
        market.get("commentsEnabled"),
        _parse_uma_status(market),
        safe_float(market.get("rewardsMinSize")),
        safe_float(market.get("rewardsMaxSpread")),
        safe_float(market.get("clobRewards")),
        safe_float(market.get("secondsDelay")),
        safe_float(market.get("lowerBound")),
        safe_float(market.get("upperBound")),
        safe_float(market.get("orderPriceMinTickSize")),
        safe_float(market.get("orderMinSize")),
        safe_float(market.get("makerBaseFee")),
        safe_float(market.get("takerBaseFee")),
        safe_float(market.get("spread")),
        safe_float(market.get("lastTradePrice")),
        safe_float(market.get("bestBid")),
        safe_float(market.get("bestAsk")),
        safe_float(market.get("fee")),
        market.get("startDate"),
        market.get("endDate"),
        market.get("createdAt"),
        market.get("updatedAt"),
        market.get("closedTime"),
        market.get("gameStartTime"),
        market.get("eventStartTime"),
        market.get("acceptingOrdersTimestamp"),
        safe_float(market.get("liquidity")),
        safe_float(market.get("liquidityNum")),
        safe_float(market.get("volume")),
        safe_float(market.get("volumeNum")),
        safe_float(market.get("volume24h")),
        safe_float(market.get("volume1wk")),
        safe_float(market.get("volume1mo")),
        safe_float(market.get("volume1yr")),
    ]


def _iter_market_rows(events: List[Dict[str, Any]]) -> Iterator[List[Any]]:
    for event in events:
        for market in event.get("markets", []):
            yield build_market_row(event, market)


def populate_markets(
    conn: psycopg2.extensions.connection,
    events: List[Dict[str, Any]],
    *,
    batch_size: int,
) -> int:
    """Insert markets for one event page."""
    return _insert_rows(
        conn,
        "markets",
        MARKET_COLUMNS,
        _iter_market_rows(events),
        batch_size=batch_size,
        conflict_clause="ON CONFLICT (market_id) DO NOTHING",
    )


# ---------- Tokens ----------
TOKEN_COLUMNS = ["token_id", "market_id", "outcome"]


def _iter_token_rows(events: List[Dict[str, Any]]) -> Iterator[List[Any]]:
    for event in events:
        for market in event.get("markets", []):
            outcomes = parse_list(market.get("outcomes")) or []
            token_ids = parse_list(market.get("clobTokenIds")) or []
            for outcome, token_id in zip(outcomes, token_ids):
                normalized_token_id = _normalize_text_id(token_id)
                market_id = _normalize_text_id(market.get("id"))
                if normalized_token_id and market_id:
                    yield [normalized_token_id, market_id, outcome]


def populate_tokens(
    conn: psycopg2.extensions.connection,
    events: List[Dict[str, Any]],
    *,
    batch_size: int,
) -> int:
    """Insert outcome tokens for each market page."""
    return _insert_rows(
        conn,
        "tokens",
        TOKEN_COLUMNS,
        _iter_token_rows(events),
        batch_size=batch_size,
        conflict_clause="ON CONFLICT (token_id) DO NOTHING",
    )


# ---------- Tags ----------
TAG_COLUMNS = ["tag_id", "label", "updated_at", "created_at", "published_at"]


def _iter_tag_rows(events: List[Dict[str, Any]]) -> Iterator[List[Any]]:
    seen: Set[str] = set()

    for event in events:
        for tag in event.get("tags", []):
            tag_id = _normalize_text_id(tag.get("id"))
            if not tag_id or tag_id in seen:
                continue
            seen.add(tag_id)
            yield [
                tag_id,
                tag.get("label"),
                tag.get("updatedAt") or tag.get("updated_at"),
                tag.get("createdAt"),
                tag.get("publishedAt") or tag.get("published_at"),
            ]


def populate_tags(
    conn: psycopg2.extensions.connection,
    events: List[Dict[str, Any]],
    *,
    batch_size: int,
) -> int:
    """Insert unique tags for one event page."""
    return _insert_rows(
        conn,
        "tags",
        TAG_COLUMNS,
        _iter_tag_rows(events),
        batch_size=batch_size,
        conflict_clause="ON CONFLICT (tag_id) DO NOTHING",
    )


# ---------- Event-tag linkage ----------
TAG_LIST_COLUMNS = ["event_id", "tag_id"]


def _iter_tag_link_rows(events: List[Dict[str, Any]]) -> Iterator[List[Any]]:
    seen: Set[Tuple[str, str]] = set()

    for event in events:
        event_id = _normalize_text_id(event.get("id"))
        if not event_id:
            continue

        for tag in event.get("tags", []):
            tag_id = _normalize_text_id(tag.get("id"))
            if not tag_id:
                continue

            key = (event_id, tag_id)
            if key in seen:
                continue
            seen.add(key)
            yield [event_id, tag_id]


def populate_tag_list(
    conn: psycopg2.extensions.connection,
    events: List[Dict[str, Any]],
    *,
    batch_size: int,
) -> int:
    """Insert event-to-tag mappings for one event page."""
    return _insert_rows(
        conn,
        "tag_list",
        TAG_LIST_COLUMNS,
        _iter_tag_link_rows(events),
        batch_size=batch_size,
    )


# ---------- Helpers for linking series ----------
def attach_series_ids_to_events(
    events: List[Dict[str, Any]],
    event_to_series: Dict[str, str],
) -> int:
    """Ensure each event has a seriesId by mapping series->events from series data."""
    attached = 0

    for event in events:
        if event.get("seriesId") or event.get("series_id"):
            continue

        event_id = _normalize_text_id(event.get("id"))
        if not event_id:
            continue

        series_id = event_to_series.get(event_id)
        if series_id:
            event["seriesId"] = series_id
            attached += 1

    return attached


def _connect_with_retry(
    conn_kwargs: Dict[str, Any],
    *,
    retry_seconds: int = 5,
) -> psycopg2.extensions.connection:
    """Wait for Postgres readiness instead of failing a whole refresh cycle."""
    attempt = 0
    while True:
        attempt += 1
        try:
            return psycopg2.connect(**conn_kwargs)
        except psycopg2.OperationalError as exc:
            _log(
                "Postgres is not ready yet "
                f"(attempt {attempt}, retrying in {retry_seconds}s): {exc}",
                error=True,
            )
            time.sleep(retry_seconds)


# ---------- One-time init helpers ----------
INIT_MARKER = Path(
    os.environ.get("INIT_MARKER_PATH", "/app/db/data_initialization/.init_done")
)


def _resolve_closed_flag(default_closed: Optional[str]) -> Tuple[str, bool]:
    """
    Decide whether to request closed markets on this run.

    If CLOSED is explicitly set, honor it. Otherwise, run closed="true" once
    (when the marker file is absent) and closed="false" thereafter, even across
    container restarts that keep the filesystem layer.
    """
    if default_closed is not None:
        return default_closed, False

    if INIT_MARKER.exists():
        return "false", False

    return "true", True


# ---------- Orchestration ----------
def populate_database(
    db_name: str,
    closed: str = "false",
    limit: Optional[int] = None,
    host: Optional[str] = None,
    port: Optional[str] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
    connect_timeout_seconds: int = 5,
    connect_retry_seconds: int = 5,
    request_timeout_seconds: int = 30,
    series_page_size: int = 100,
    event_page_size: int = 100,
    insert_batch_size: int = 250,
    tag_id: Optional[str] = None,
) -> None:
    """Populate all tables using data from Polymarket without materializing the full dataset."""
    conn_kwargs = {
        "dbname": db_name,
        "connect_timeout": connect_timeout_seconds,
    }
    if host:
        conn_kwargs["host"] = host
    if port:
        conn_kwargs["port"] = port
    if user:
        conn_kwargs["user"] = user
    if password:
        conn_kwargs["password"] = password

    conn = _connect_with_retry(conn_kwargs, retry_seconds=connect_retry_seconds)

    total_series = 0
    total_events = 0
    total_markets = 0
    total_tokens = 0
    total_tags = 0
    total_tag_links = 0
    event_to_series: Dict[str, str] = {}

    try:
        with requests.Session() as session:
            for page_number, series_page in enumerate(
                iter_series_pages(
                    session,
                    limit=None,
                    page_size=series_page_size,
                    timeout_seconds=request_timeout_seconds,
                ),
                start=1,
            ):
                total_series += len(series_page)
                event_to_series.update(build_event_to_series_map(series_page))
                populate_series_page(conn, series_page, batch_size=insert_batch_size)
                _log(
                    "Processed series page "
                    f"{page_number} with {len(series_page)} records "
                    f"(cached {len(event_to_series)} event-to-series links)"
                )

            for page_number, events_page in enumerate(
                iter_event_pages(
                    session,
                    closed=closed,
                    tag_id=tag_id,
                    limit=limit,
                    page_size=event_page_size,
                    timeout_seconds=request_timeout_seconds,
                ),
                start=1,
            ):
                attached_series_ids = attach_series_ids_to_events(
                    events_page, event_to_series
                )
                event_count = populate_events(
                    conn, events_page, batch_size=insert_batch_size
                )
                market_count = populate_markets(
                    conn, events_page, batch_size=insert_batch_size
                )
                token_count = populate_tokens(
                    conn, events_page, batch_size=insert_batch_size
                )
                tag_count = populate_tags(
                    conn, events_page, batch_size=insert_batch_size
                )
                tag_link_count = populate_tag_list(
                    conn, events_page, batch_size=insert_batch_size
                )

                total_events += event_count
                total_markets += market_count
                total_tokens += token_count
                total_tags += tag_count
                total_tag_links += tag_link_count

                _log(
                    "Processed event page "
                    f"{page_number}: events={event_count}, markets={market_count}, "
                    f"tokens={token_count}, tags={tag_count}, tag_links={tag_link_count}, "
                    f"attached_series_ids={attached_series_ids}"
                )

        _log(
            "Load summary: "
            f"series={total_series}, events={total_events}, markets={total_markets}, "
            f"tokens={total_tokens}, tags={total_tags}, tag_links={total_tag_links}"
        )
    finally:
        conn.close()


def main() -> None:
    db_name = os.environ.get("POSTGRES_DB", "postgres")
    host = os.environ.get("POSTGRES_HOST", "postgres")
    port = os.environ.get("POSTGRES_PORT", "5432")
    user = os.environ.get("POSTGRES_USER", "postgres")
    password = os.environ.get("POSTGRES_PASSWORD", "postgres")
    closed_env = os.environ.get("CLOSED")
    closed, should_mark_init = _resolve_closed_flag(closed_env)
    limit = _parse_int(os.environ.get("LIMIT"))
    connect_timeout_seconds = (
        _parse_int(os.environ.get("DB_CONNECT_TIMEOUT_SECONDS")) or 5
    )
    connect_retry_seconds = (
        _parse_int(os.environ.get("DB_CONNECT_RETRY_SECONDS")) or 5
    )
    request_timeout_seconds = _parse_positive_int(
        os.environ.get("DATA_INIT_REQUEST_TIMEOUT_SECONDS"), 30
    )
    series_page_size = _parse_positive_int(
        os.environ.get("DATA_INIT_SERIES_PAGE_SIZE"), 100
    )
    event_page_size = _parse_positive_int(
        os.environ.get("DATA_INIT_EVENT_PAGE_SIZE"), 100
    )
    insert_batch_size = _parse_positive_int(
        os.environ.get("DATA_INIT_INSERT_BATCH_SIZE"), 250
    )
    tag_id = os.environ.get("DATA_INIT_TAG_ID")

    # Scheduling controls
    interval_seconds = (
        _parse_int(os.environ.get("REFRESH_INTERVAL_SECONDS")) or 43200
    )  # default 12h
    run_once = _is_truthy(os.environ.get("RUN_ONCE")) or interval_seconds <= 0

    while True:
        started_at = time.time()
        _log(
            f"Starting load into {db_name}@{host}:{port} "
            f"(limit={limit}, closed={closed}, series_page_size={series_page_size}, "
            f"event_page_size={event_page_size}, insert_batch_size={insert_batch_size})"
        )
        try:
            populate_database(
                db_name,
                closed=closed,
                limit=limit,
                host=host,
                port=port,
                user=user,
                password=password,
                connect_timeout_seconds=connect_timeout_seconds,
                connect_retry_seconds=connect_retry_seconds,
                request_timeout_seconds=request_timeout_seconds,
                series_page_size=series_page_size,
                event_page_size=event_page_size,
                insert_batch_size=insert_batch_size,
                tag_id=tag_id,
            )
        except Exception as exc:
            _log(f"ERROR during load: {exc}", error=True)
        else:
            elapsed = time.time() - started_at
            _log(f"Load finished in {elapsed:.1f}s")
            if should_mark_init and not INIT_MARKER.exists():
                INIT_MARKER.parent.mkdir(parents=True, exist_ok=True)
                INIT_MARKER.touch()
                # Switch to open markets only on subsequent runs
                closed = "false"
                should_mark_init = False

        if run_once:
            break

        _log(f"Sleeping for {interval_seconds} seconds before next run...")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    main()
