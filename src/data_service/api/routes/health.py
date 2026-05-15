from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..db.client import get_clickhouse_health

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, Any]:
    """Report whether the API can reach ClickHouse and see the Chainlink table."""

    try:
        db_health = get_clickhouse_health("chainlink_prices")
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ClickHouse is unreachable: {exc}",
        ) from exc

    if not db_health.table_exists:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"ClickHouse is reachable but table "
                f"{db_health.database}.{db_health.table} was not found."
            ),
        )

    return {
        "status": "ok",
        "database": db_health.database,
        "table": db_health.table,
    }
