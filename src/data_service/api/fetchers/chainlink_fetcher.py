from __future__ import annotations

import textwrap
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from ..db.client import get_clickhouse_client, get_qualified_table_name

if TYPE_CHECKING:
    import pandas as pd


class ChainlinkFetchError(RuntimeError):
    """Raised when Chainlink price data cannot be fetched for the API."""


def _get_pandas_module() -> Any:
    try:
        import pandas as pd
    except ImportError as exc:
        raise ChainlinkFetchError(
            "pandas is required to shape Chainlink API query results."
        ) from exc
    return pd


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _query_dataframe(query: str, parameters: dict[str, Any]) -> "pd.DataFrame":
    pd = _get_pandas_module()
    client = get_clickhouse_client()

    query_df = getattr(client, "query_df", None)
    if callable(query_df):
        return query_df(query, parameters=parameters)

    result = client.query(query, parameters=parameters)
    return pd.DataFrame(result.result_rows, columns=result.column_names)


def _clean_price_frame(frame: "pd.DataFrame") -> "pd.DataFrame":
    pd = _get_pandas_module()
    expected_columns = ["update_timestamp", "value", "symbol"]

    if frame.empty and len(frame.columns) == 0:
        return pd.DataFrame(columns=expected_columns)

    missing_columns = [column for column in expected_columns if column not in frame.columns]
    if missing_columns:
        raise ChainlinkFetchError(
            "Chainlink query result is missing expected columns: "
            + ", ".join(sorted(missing_columns))
        )

    cleaned_frame = frame.loc[:, expected_columns].copy()
    cleaned_frame = cleaned_frame.dropna(subset=["value"])
    cleaned_frame["update_timestamp"] = pd.to_datetime(
        cleaned_frame["update_timestamp"],
        utc=True,
        errors="coerce",
    )
    cleaned_frame = cleaned_frame.dropna(subset=["update_timestamp"])

    return cleaned_frame.reset_index(drop=True)


def fetch_chainlink_prices(
    symbol: str,
    start: datetime,
    end: datetime,
    limit: int,
) -> "pd.DataFrame":
    """Fetch Chainlink prices for the requested symbol and time range."""

    table_name = get_qualified_table_name("chainlink_prices")
    query = textwrap.dedent(
        f"""
        SELECT
            update_timestamp,
            value,
            symbol
        FROM {table_name}
        WHERE lower(symbol) = lower(%(symbol)s)
          AND update_timestamp >= %(start)s
          AND update_timestamp <= %(end)s
        ORDER BY update_timestamp ASC
        LIMIT %(limit)s
        """
    ).strip()
    parameters = {
        "symbol": symbol.strip(),
        "start": _ensure_utc(start),
        "end": _ensure_utc(end),
        "limit": limit,
    }

    try:
        frame = _query_dataframe(query, parameters)
    except Exception as exc:
        raise ChainlinkFetchError(f"ClickHouse query failed: {exc}") from exc

    return _clean_price_frame(frame)


def fetch_latest_chainlink_prices(symbol: str, limit: int) -> "pd.DataFrame":
    """Fetch the latest available Chainlink prices for a symbol."""

    table_name = get_qualified_table_name("chainlink_prices")
    query = textwrap.dedent(
        f"""
        SELECT
            update_timestamp,
            value,
            symbol
        FROM {table_name}
        WHERE lower(symbol) = lower(%(symbol)s)
        ORDER BY update_timestamp DESC
        LIMIT %(limit)s
        """
    ).strip()
    parameters = {
        "symbol": symbol.strip(),
        "limit": limit,
    }

    try:
        frame = _query_dataframe(query, parameters)
    except Exception as exc:
        raise ChainlinkFetchError(f"ClickHouse query failed: {exc}") from exc

    cleaned_frame = _clean_price_frame(frame)
    return cleaned_frame.sort_values("update_timestamp").reset_index(drop=True)
