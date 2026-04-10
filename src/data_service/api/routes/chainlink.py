from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status

from ..fetchers.chainlink_fetcher import (
    ChainlinkFetchError,
    fetch_latest_chainlink_prices,
    fetch_chainlink_prices,
)

router = APIRouter(prefix="/chainlink", tags=["chainlink"])


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalize_symbol(symbol: str) -> str:
    cleaned = re.sub(r"\s+", "", symbol.strip().upper())
    cleaned = cleaned.replace("_", "/").replace("-", "/")
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="symbol must not be blank.",
        )

    if "/" in cleaned:
        base, quote = cleaned.split("/", 1)
        if not base or not quote:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="symbol format is invalid. Use values like btc, btc/usd, or btcusd.",
            )
        return f"{base}/{quote}"

    if cleaned.endswith("USD") and len(cleaned) > 3:
        return f"{cleaned[:-3]}/USD"

    return f"{cleaned}/USD"


def _resolve_time_window(
    start: datetime | None,
    end: datetime | None,
    latest: bool,
) -> tuple[datetime | None, datetime | None]:
    if latest:
        if start is not None or end is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="latest cannot be combined with start or end.",
            )
        return None, None

    if start is None and end is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide start and end, or use latest=true.",
        )

    if start is None or end is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start and end must be provided together.",
        )

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


def _serialize_record(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "update_timestamp": _serialize_datetime(record.get("update_timestamp")),
        "value": None if record.get("value") is None else float(record["value"]),
        "symbol": None if record.get("symbol") is None else str(record["symbol"]),
    }


@router.get("/prices")
def get_chainlink_prices(
    symbol: Annotated[
        str,
        Query(
            min_length=1,
            description="Chainlink symbol. Accepts values like btc, BTC/USD, or btcusd.",
        ),
    ],
    start: Annotated[
        datetime | None,
        Query(description="ISO 8601 start time. Must be provided together with end."),
    ] = None,
    end: Annotated[
        datetime | None,
        Query(description="ISO 8601 end time. Must be provided together with start."),
    ] = None,
    latest: Annotated[
        bool,
        Query(
            description="If true, return the newest available rows for the symbol, up to limit.",
        ),
    ] = False,
    limit: Annotated[
        int,
        Query(
            ge=1,
            le=10_000,
            description="Maximum number of rows to return.",
        ),
    ] = 1_000,
) -> dict[str, Any]:
    """Return Chainlink prices for an explicit time window or the latest rows."""

    normalized_symbol = _normalize_symbol(symbol)
    start_utc, end_utc = _resolve_time_window(start, end, latest)

    try:
        if latest:
            frame = fetch_latest_chainlink_prices(
                symbol=normalized_symbol,
                limit=limit,
            )
        else:
            frame = fetch_chainlink_prices(
                symbol=normalized_symbol,
                start=start_utc,
                end=end_utc,
                limit=limit,
            )
    except ChainlinkFetchError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch Chainlink prices: {exc}",
        ) from exc

    data = [_serialize_record(record) for record in frame.to_dict(orient="records")]
    return {
        "symbol": normalized_symbol,
        "start": _serialize_datetime(start_utc),
        "end": _serialize_datetime(end_utc),
        "count": len(data),
        "data": data,
    }
