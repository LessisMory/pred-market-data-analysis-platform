from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status

from ..fetchers.market_chart_fetcher import (
    MarketChartFetchError,
    fetch_available_markets,
    fetch_market_depth_volume_chart,
)

router = APIRouter(prefix="/markets", tags=["markets"])
DEPTH_LEVELS = range(1, 6)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalize_required_text(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must not be blank.",
        )
    return cleaned


def _normalize_market_id(market_id: str) -> str:
    return _normalize_required_text(market_id, "market_id")


def _normalize_asset_id(asset_id: str) -> str:
    return _normalize_required_text(asset_id, "asset_id")


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
        "theoretical_price": _serialize_float(record.get("theoretical_price")),
        "spread": _serialize_float(record.get("best_price_spread")),
        "imbalance": _serialize_float(record.get("orderbook_imbalance")),
    }


def _serialize_market_summary(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "slug": _serialize_string(record.get("slug")),
        "market_id": _serialize_string(record.get("market_id")),
        "asset_id": _serialize_string(record.get("asset_id")),
        "market_name": _serialize_string(record.get("market_name")),
        "token_name": _serialize_string(record.get("token_name")),
    }


def _serialize_market_metadata(record: dict[str, Any] | None) -> dict[str, Any]:
    if record is None:
        return {
            "slug": None,
            "market_id": None,
            "asset_id": None,
            "market_name": None,
            "token_name": None,
            "strike_price": None,
            "resolve_price": None,
            "result_logic": None,
        }

    return {
        "slug": _serialize_string(record.get("slug")),
        "market_id": _serialize_string(record.get("market_id")),
        "asset_id": _serialize_string(record.get("asset_id")),
        "market_name": _serialize_string(record.get("market_name")),
        "token_name": _serialize_string(record.get("token_name")),
        "strike_price": _serialize_float(record.get("strike_price")),
        "resolve_price": _serialize_float(record.get("resolve_price")),
        "result_logic": _serialize_string(record.get("result_logic")),
    }


@router.get("")
def get_available_markets(
    limit: Annotated[
        int,
        Query(
            ge=1,
            le=10_000,
            description="Maximum number of distinct markets to return.",
        ),
    ] = 100,
) -> dict[str, Any]:
    """Return distinct market identifiers and metadata available in the chart table."""

    try:
        frame = fetch_available_markets(limit=limit)
    except MarketChartFetchError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch available markets: {exc}",
        ) from exc

    data = [_serialize_market_summary(record) for record in frame.to_dict(orient="records")]
    return {
        "count": len(data),
        "data": data,
    }


@router.get("/depth-volume-chart")
def get_market_depth_volume_chart(
    market_id: Annotated[
        str,
        Query(
            min_length=1,
            description="Polymarket market ID.",
        ),
    ],
    asset_id: Annotated[
        str,
        Query(
            min_length=1,
            description="Outcome asset ID for the market token.",
        ),
    ],
    limit: Annotated[
        int,
        Query(
            ge=1,
            le=10_000,
            description="Maximum number of latest timestamped chart points to return.",
        ),
    ] = 1000,
) -> dict[str, Any]:
    """Return the latest chart-ready points for a market and asset pair."""

    normalized_market_id = _normalize_market_id(market_id)
    normalized_asset_id = _normalize_asset_id(asset_id)

    try:
        frame = fetch_market_depth_volume_chart(
            market_id=normalized_market_id,
            asset_id=normalized_asset_id,
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
        "count": len(data),
        **metadata,
        "data": data,
    }
