from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status

from ..fetchers.market_chart_fetcher import (
    MarketChartFetchError,
    fetch_market_depth_volume_chart,
)

router = APIRouter(prefix="/markets", tags=["markets"])
DEPTH_LEVELS = range(1, 6)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalize_slug(slug: str) -> str:
    cleaned = slug.strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="slug must not be blank.",
        )
    return cleaned


def _resolve_time_window(
    start: datetime,
    end: datetime,
) -> tuple[datetime, datetime]:
    start_utc = _ensure_utc(start)
    end_utc = _ensure_utc(end)
    if start_utc >= end_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be earlier than end.",
        )
    return start_utc, end_utc


def _serialize_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if not isinstance(value, datetime):
        return str(value)
    return _ensure_utc(value).isoformat().replace("+00:00", "Z")


def _serialize_float(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


def _serialize_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(value)


def _serialize_string(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _number_or_zero(value: Any) -> float:
    serialized = _serialize_float(value)
    return 0.0 if serialized is None else serialized


def _count_or_zero(value: Any) -> int:
    serialized = _serialize_int(value)
    return 0 if serialized is None else serialized


def _build_depth_levels(record: dict[str, Any], side: str) -> tuple[list[dict[str, Any]], float]:
    cumulative_size = 0.0
    levels: list[dict[str, Any]] = []

    for level in DEPTH_LEVELS:
        price = _serialize_float(record.get(f"{side}_L{level}_price"))
        size = _serialize_float(record.get(f"{side}_L{level}_size"))
        if price is None and size is None:
            continue

        cumulative_size += 0.0 if size is None else size
        levels.append(
            {
                "level": level,
                "price": price,
                "size": size,
                "cumulative_size": cumulative_size,
            }
        )

    return levels, cumulative_size


def _serialize_chart_point(record: dict[str, Any]) -> dict[str, Any]:
    bids, total_bid_size = _build_depth_levels(record, "bid")
    asks, total_ask_size = _build_depth_levels(record, "ask")

    buy_size = _number_or_zero(record.get("buy_trade_size"))
    sell_size = _number_or_zero(record.get("sell_trade_size"))
    buy_count = _count_or_zero(record.get("buy_trade_count"))
    sell_count = _count_or_zero(record.get("sell_trade_count"))
    buy_nominal_value = _number_or_zero(record.get("buy_trade_nominal_value"))
    sell_nominal_value = _number_or_zero(record.get("sell_trade_nominal_value"))

    return {
        "slug": _serialize_string(record.get("slug")),
        "timestamp": _serialize_datetime(record.get("timestamp")),
        "trade_volume": {
            "buy": {
                "vwap": _serialize_float(record.get("buy_trade_vwap")),
                "size": buy_size,
                "count": buy_count,
                "nominal_value": buy_nominal_value,
            },
            "sell": {
                "vwap": _serialize_float(record.get("sell_trade_vwap")),
                "size": sell_size,
                "count": sell_count,
                "nominal_value": sell_nominal_value,
            },
            "total_size": buy_size + sell_size,
            "total_count": buy_count + sell_count,
            "total_nominal_value": buy_nominal_value + sell_nominal_value,
        },
        "order_book_depth": {
            "bids": bids,
            "asks": asks,
            "total_bid_size": total_bid_size,
            "total_ask_size": total_ask_size,
        },
        "mid_price": _serialize_float(record.get("l1_passive_mid_price")),
        "spread": _serialize_float(record.get("best_price_spread")),
        "imbalance": _serialize_float(record.get("orderbook_imbalance")),
    }


def _serialize_market_metadata(record: dict[str, Any] | None) -> dict[str, Any]:
    if record is None:
        return {
            "market": None,
            "asset_id": None,
            "market_name": None,
            "token_name": None,
        }

    return {
        "market": _serialize_string(record.get("market")),
        "asset_id": _serialize_string(record.get("asset_id")),
        "market_name": _serialize_string(record.get("market_name")),
        "token_name": _serialize_string(record.get("token_name")),
    }


@router.get("/depth-volume-chart")
def get_market_depth_volume_chart(
    slug: Annotated[
        str,
        Query(
            min_length=1,
            description="Market slug used together with timestamp to identify chart points.",
        ),
    ],
    start: Annotated[
        datetime,
        Query(description="ISO 8601 start time for the chart window."),
    ],
    end: Annotated[
        datetime,
        Query(description="ISO 8601 end time for the chart window."),
    ],
    limit: Annotated[
        int,
        Query(
            ge=1,
            le=10_000,
            description="Maximum number of timestamped chart points to return.",
        ),
    ] = 1_000,
) -> dict[str, Any]:
    """Return chart-ready order-book depth and trade volume points for a market slug."""

    normalized_slug = _normalize_slug(slug)
    start_utc, end_utc = _resolve_time_window(start, end)

    try:
        frame = fetch_market_depth_volume_chart(
            slug=normalized_slug,
            start=start_utc,
            end=end_utc,
            limit=limit,
        )
    except MarketChartFetchError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch market chart data: {exc}",
        ) from exc

    records = frame.to_dict(orient="records")
    metadata = _serialize_market_metadata(records[0] if records else None)
    data = [_serialize_chart_point(record) for record in records]
    return {
        "slug": normalized_slug,
        "start": _serialize_datetime(start_utc),
        "end": _serialize_datetime(end_utc),
        "count": len(data),
        **metadata,
        "data": data,
    }
