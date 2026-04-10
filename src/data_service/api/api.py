from __future__ import annotations

from fastapi import FastAPI

from .routes.chainlink import router as chainlink_router
from .routes.health import router as health_router
from .routes.markets import router as markets_router

app = FastAPI(title="Data Service API")
app.include_router(chainlink_router)
app.include_router(health_router)
app.include_router(markets_router)
