from __future__ import annotations

import textwrap
from typing import Any

import pandas as pd

from ..db.client import get_clickhouse_client, get_qualified_table_name

DEPTH_LEVELS = range(1, 6)
DEPTH_COLUMNS = [
    column
    for side in ("bid", "ask")
    for level in DEPTH_LEVELS
    for column in (f"{side}_L{level}_price", f"{side}_L{level}_size")
]
EXPECTED_COLUMNS = [
    "slug",
    "market_id",
    "asset_id",
    "timestamp",
    "buy_trade_vwap",
    "buy_trade_size",
    "buy_trade_count",
    "buy_trade_nominal_value",
    "sell_trade_vwap",
    "sell_trade_size",
    "sell_trade_count",
    "sell_trade_nominal_value",
    *DEPTH_COLUMNS,
    "market_name",
    "token_name",
    "l1_passive_mid_price",
    "best_price_spread",
    "orderbook_imbalance",
]
MARKET_METADATA_COLUMNS = [
    "slug",
    "market_id",
    "asset_id",
    "market_name",
    "token_name",
]


class MarketChartFetchError(RuntimeError):
    """Raised when market chart data cannot be fetched for the API."""


def _query_dataframe(query: str, parameters: dict[str, Any]) -> pd.DataFrame:
    client = get_clickhouse_client()

    query_df = getattr(client, "query_df", None)
    if callable(query_df):
        return query_df(query, parameters=parameters)

    result = client.query(query, parameters=parameters)
    return pd.DataFrame(result.result_rows, columns=result.column_names)


def _clean_market_chart_frame(frame: pd.DataFrame) -> pd.DataFrame:
    if frame.empty and len(frame.columns) == 0:
        return pd.DataFrame(columns=EXPECTED_COLUMNS)

    missing_columns = [column for column in EXPECTED_COLUMNS if column not in frame.columns]
    if missing_columns:
        raise MarketChartFetchError(
            "Market chart query result is missing expected columns: "
            + ", ".join(sorted(missing_columns))
        )

    cleaned_frame = frame.loc[:, EXPECTED_COLUMNS].copy()
    cleaned_frame["timestamp"] = pd.to_datetime(
        cleaned_frame["timestamp"],
        utc=True,
        errors="coerce",
    )
    cleaned_frame = cleaned_frame.dropna(subset=["timestamp"])

    numeric_columns = [
        column
        for column in EXPECTED_COLUMNS
        if column
        not in {"slug", "market_id", "asset_id", "timestamp", "market_name", "token_name"}
    ]
    for column in numeric_columns:
        cleaned_frame[column] = pd.to_numeric(cleaned_frame[column], errors="coerce")

    cleaned_frame = cleaned_frame.where(pd.notna(cleaned_frame), None)
    cleaned_frame = cleaned_frame.sort_values("timestamp")
    return cleaned_frame.reset_index(drop=True)


def _clean_market_metadata_frame(frame: pd.DataFrame) -> pd.DataFrame:
    if frame.empty and len(frame.columns) == 0:
        return pd.DataFrame(columns=MARKET_METADATA_COLUMNS)

    missing_columns = [
        column for column in MARKET_METADATA_COLUMNS if column not in frame.columns
    ]
    if missing_columns:
        raise MarketChartFetchError(
            "Market metadata query result is missing expected columns: "
            + ", ".join(sorted(missing_columns))
        )

    cleaned_frame = frame.loc[:, MARKET_METADATA_COLUMNS].copy()
    cleaned_frame = cleaned_frame.where(pd.notna(cleaned_frame), None)
    cleaned_frame = cleaned_frame.sort_values(
        ["market_name", "token_name", "slug", "market_id", "asset_id"],
        na_position="last",
    )
    return cleaned_frame.reset_index(drop=True)


def fetch_available_markets(limit: int) -> pd.DataFrame:
    """Fetch distinct available market identifiers and metadata."""

    table_name = get_qualified_table_name("15m_btc_updown_order_book")
    query = textwrap.dedent(
        f"""
        SELECT DISTINCT
            slug,
            market AS market_id,
            asset_id,
            market_name,
            token_name
        FROM {table_name}
        WHERE slug != ''
          AND market != ''
          AND asset_id != ''
        ORDER BY market_name ASC, token_name ASC, slug ASC, market ASC, asset_id ASC
        LIMIT %(limit)s
        """
    ).strip()

    try:
        frame = _query_dataframe(query, {"limit": limit})
    except Exception as exc:
        raise MarketChartFetchError(f"ClickHouse query failed: {exc}") from exc

    return _clean_market_metadata_frame(frame)


def fetch_market_depth_volume_chart(
    market_id: str,
    asset_id: str,
    limit: int,
) -> pd.DataFrame:
    """Fetch the latest chart-ready points for a market and asset pair."""

    table_name = get_qualified_table_name("15m_btc_updown_order_book")
    query = textwrap.dedent(
        f"""
        SELECT
            slug,
            market AS market_id,
            asset_id,
            timestamp,
            buy_trade_vwap,
            buy_trade_size,
            buy_trade_count,
            buy_trade_nominal_value,
            sell_trade_vwap,
            sell_trade_size,
            sell_trade_count,
            sell_trade_nominal_value,
            bid_L1_price,
            bid_L1_size,
            bid_L2_price,
            bid_L2_size,
            bid_L3_price,
            bid_L3_size,
            bid_L4_price,
            bid_L4_size,
            bid_L5_price,
            bid_L5_size,
            ask_L1_price,
            ask_L1_size,
            ask_L2_price,
            ask_L2_size,
            ask_L3_price,
            ask_L3_size,
            ask_L4_price,
            ask_L4_size,
            ask_L5_price,
            ask_L5_size,
            market_name,
            token_name,
            l1_passive_mid_price,
            best_price_spread,
            orderbook_imbalance
        FROM {table_name}
        WHERE market = %(market_id)s
          AND asset_id = %(asset_id)s
        ORDER BY timestamp DESC
        LIMIT %(limit)s
        """
    ).strip()
    parameters = {
        "market_id": market_id.strip(),
        "asset_id": asset_id.strip(),
        "limit": limit,
    }

    try:
        frame = _query_dataframe(query, parameters)
    except Exception as exc:
        raise MarketChartFetchError(f"ClickHouse query failed: {exc}") from exc

    return _clean_market_chart_frame(frame)
