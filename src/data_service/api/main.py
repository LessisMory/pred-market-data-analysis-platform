"""
Data Service REST API.

Serves historical prediction market + crypto price data out of the
PostgreSQL tables populated by the transform_layer pipeline.

Consumed by the Node.js backend's analyticsService (see
src/fullstack/back_end/services/analyticsService.js).

Run locally:
    uvicorn data_service.api.main:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, List, Optional

import asyncpg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

POSTGRES_DSN = os.getenv(
    "POSTGRES_DSN",
    "postgresql://postgres:postgres@localhost:5432/postgres",
)

# ─────────────────────────────────────────────────────────────
# Lifespan — connection pool setup/teardown
# ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(
        POSTGRES_DSN,
        min_size=2,
        max_size=10,
    )
    yield
    await app.state.pool.close()


app = FastAPI(
    title="OBAnalyzer Data Service",
    description="Read-only REST API over the prediction-market & price time-series tables.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def _row_to_dict(row: asyncpg.Record) -> dict[str, Any]:
    """Convert asyncpg Record to JSON-safe dict (datetimes → ISO strings)."""
    result: dict[str, Any] = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


async def _fetch(app: FastAPI, sql: str, *args) -> List[dict[str, Any]]:
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
    return [_row_to_dict(r) for r in rows]


# ─────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok", "db": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB unreachable: {exc}")


# ─────────────────────────────────────────────────────────────
# GET /chainlink/prices
# ─────────────────────────────────────────────────────────────
@app.get("/chainlink/prices")
async def get_chainlink_prices(
    symbol: str = Query(..., min_length=1),
    start: datetime = Query(...),
    end: datetime = Query(...),
    limit: int = Query(1000, ge=1, le=10000),
):
    if start >= end:
        raise HTTPException(status_code=400, detail="start must be before end")

    sql = """
        SELECT id, source, symbol, value, full_accuracy_value,
               update_timestamp, send_timestamp, arrival_timestamp, ingested_at
          FROM chainlink_prices
         WHERE symbol = $1
           AND update_timestamp BETWEEN $2 AND $3
         ORDER BY update_timestamp DESC
         LIMIT $4
    """
    rows = await _fetch(app, sql, symbol, start, end, limit)
    return {"data": rows, "count": len(rows)}


# ─────────────────────────────────────────────────────────────
# GET /prices/binance
# ─────────────────────────────────────────────────────────────
@app.get("/prices/binance")
async def get_binance_prices(
    symbol: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    if symbol:
        sql = """
            SELECT id, source, symbol, value, full_accuracy_value,
                   update_timestamp, arrival_timestamp, ingested_at
              FROM binance_prices
             WHERE symbol = $1
             ORDER BY update_timestamp DESC
             LIMIT $2 OFFSET $3
        """
        rows = await _fetch(app, sql, symbol, limit, offset)
    else:
        sql = """
            SELECT id, source, symbol, value, full_accuracy_value,
                   update_timestamp, arrival_timestamp, ingested_at
              FROM binance_prices
             ORDER BY update_timestamp DESC
             LIMIT $1 OFFSET $2
        """
        rows = await _fetch(app, sql, limit, offset)

    return {"data": rows, "count": len(rows)}


# ─────────────────────────────────────────────────────────────
# GET /markets
# ─────────────────────────────────────────────────────────────
@app.get("/markets")
async def get_markets(
    slug: Optional[str] = None,
    closed: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    filters: list[str] = []
    params: list[Any] = []

    if slug is not None:
        params.append(slug)
        filters.append(f"slug = ${len(params)}")
    if closed is not None:
        params.append(closed)
        filters.append(f"closed = ${len(params)}")

    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    params.extend([limit, offset])

    sql = f"""
        SELECT id, market_id, event_id, condition_id, slug, question, description,
               category, outcomes, clob_token_ids, spread, last_trade_price,
               best_bid, best_ask, active, closed, liquidity, volume
          FROM markets
          {where}
         ORDER BY id DESC
         LIMIT ${len(params) - 1} OFFSET ${len(params)}
    """
    rows = await _fetch(app, sql, *params)
    return {"data": rows, "count": len(rows)}


# ─────────────────────────────────────────────────────────────
# GET /data — order-book snapshots, time-range based
# ─────────────────────────────────────────────────────────────
@app.get("/data")
async def get_data(
    startTime: datetime = Query(...),
    endTime: datetime = Query(...),
    market: Optional[str] = Query(None, description="token_id or list of token_ids"),
    interval: Optional[str] = Query(None, description="1s | 5s"),
):
    if startTime >= endTime:
        raise HTTPException(status_code=400, detail="startTime must be before endTime")

    # `market` may be a single token_id or comma-separated
    token_ids: Optional[List[str]] = None
    if market:
        token_ids = [m.strip() for m in market.split(",") if m.strip()]

    # Downsampling interval — 1s is the native resolution; 5s buckets via date_trunc+floor
    if interval == "5s":
        bucket_sql = "to_timestamp(floor(extract(epoch FROM snapshot_timestamp) / 5) * 5)"
    else:
        bucket_sql = "snapshot_timestamp"

    params: list[Any] = [startTime, endTime]
    token_filter = ""
    if token_ids:
        params.append(token_ids)
        token_filter = f"AND token_id = ANY(${len(params)})"

    sql = f"""
        SELECT token_id,
               {bucket_sql} AS bucket,
               side,
               AVG(top_price)::float  AS avg_top_price,
               AVG(top_size)::float   AS avg_top_size,
               COUNT(*)               AS sample_count
          FROM order_book_snapshots
         WHERE snapshot_timestamp BETWEEN $1 AND $2
           {token_filter}
         GROUP BY token_id, bucket, side
         ORDER BY bucket ASC
         LIMIT 10000
    """
    rows = await _fetch(app, sql, *params)
    return rows  # raw array — matches Node backend's normalizeDataPayload expectation
