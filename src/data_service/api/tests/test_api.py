"""
Unit tests for the data service API.

Uses a fake asyncpg pool so no real PostgreSQL is needed.
Covers: happy path, missing params, wrong types, empty results.
"""
from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from api.main import app


# ─────────────────────────────────────────────────────────────
# Fake asyncpg pool
# ─────────────────────────────────────────────────────────────
class FakeConn:
    def __init__(self, rows):
        self._rows = rows

    async def fetch(self, _sql, *_args):
        return self._rows

    async def execute(self, _sql, *_args):
        return "OK"


class FakeAcquireCtx:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakePool:
    def __init__(self, rows=None):
        self.rows = rows or []

    def acquire(self):
        return FakeAcquireCtx(FakeConn(self.rows))

    async def close(self):
        pass


@pytest.fixture
def client_with_rows():
    def _factory(rows):
        app.state.pool = FakePool(rows)
        return TestClient(app)
    return _factory


@pytest.fixture
def client(client_with_rows):
    return client_with_rows([])


# ─────────────────────────────────────────────────────────────
# /health
# ─────────────────────────────────────────────────────────────
def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ─────────────────────────────────────────────────────────────
# /chainlink/prices
# ─────────────────────────────────────────────────────────────
class TestChainlinkPrices:
    URL = "/chainlink/prices"

    def test_200_returns_rows(self, client_with_rows):
        rows = [{
            "id": 1,
            "source": "chainlink",
            "symbol": "BTC/USD",
            "value": 50000.0,
            "full_accuracy_value": "50000000000000",
            "update_timestamp": datetime(2026, 1, 1, 12, 0),
            "send_timestamp": datetime(2026, 1, 1, 12, 0, 1),
            "arrival_timestamp": datetime(2026, 1, 1, 12, 0, 2),
            "ingested_at": datetime(2026, 1, 1, 12, 0, 3),
        }]
        c = client_with_rows(rows)
        res = c.get(self.URL, params={
            "symbol": "BTC/USD",
            "start": "2026-01-01T00:00:00",
            "end": "2026-01-02T00:00:00",
        })
        assert res.status_code == 200
        body = res.json()
        assert body["count"] == 1
        # Datetime should be ISO-encoded
        assert "T" in body["data"][0]["update_timestamp"]

    def test_422_missing_symbol(self, client):
        res = client.get(self.URL, params={
            "start": "2026-01-01T00:00:00",
            "end": "2026-01-02T00:00:00",
        })
        assert res.status_code == 422

    def test_422_missing_start(self, client):
        res = client.get(self.URL, params={
            "symbol": "BTC/USD",
            "end": "2026-01-02T00:00:00",
        })
        assert res.status_code == 422

    def test_422_invalid_date_format(self, client):
        res = client.get(self.URL, params={
            "symbol": "BTC/USD",
            "start": "not-a-date",
            "end": "2026-01-02T00:00:00",
        })
        assert res.status_code == 422

    def test_400_start_after_end(self, client):
        res = client.get(self.URL, params={
            "symbol": "BTC/USD",
            "start": "2026-01-02T00:00:00",
            "end": "2026-01-01T00:00:00",
        })
        assert res.status_code == 400

    def test_422_limit_out_of_range(self, client):
        res = client.get(self.URL, params={
            "symbol": "BTC/USD",
            "start": "2026-01-01T00:00:00",
            "end": "2026-01-02T00:00:00",
            "limit": 999999,
        })
        assert res.status_code == 422

    def test_422_limit_wrong_type(self, client):
        res = client.get(self.URL, params={
            "symbol": "BTC/USD",
            "start": "2026-01-01T00:00:00",
            "end": "2026-01-02T00:00:00",
            "limit": "abc",
        })
        assert res.status_code == 422


# ─────────────────────────────────────────────────────────────
# /prices/binance
# ─────────────────────────────────────────────────────────────
class TestBinancePrices:
    URL = "/prices/binance"

    def test_200_empty(self, client):
        res = client.get(self.URL)
        assert res.status_code == 200
        assert res.json() == {"data": [], "count": 0}

    def test_200_with_symbol(self, client_with_rows):
        rows = [{
            "id": 1, "source": "binance", "symbol": "BTCUSDT",
            "value": 50000.0, "full_accuracy_value": "50000",
            "update_timestamp": datetime(2026, 1, 1),
            "arrival_timestamp": datetime(2026, 1, 1),
            "ingested_at": datetime(2026, 1, 1),
        }]
        c = client_with_rows(rows)
        res = c.get(self.URL, params={"symbol": "BTCUSDT", "limit": 10})
        assert res.status_code == 200
        assert res.json()["count"] == 1

    def test_422_limit_negative(self, client):
        res = client.get(self.URL, params={"limit": -5})
        assert res.status_code == 422

    def test_422_offset_negative(self, client):
        res = client.get(self.URL, params={"offset": -1})
        assert res.status_code == 422


# ─────────────────────────────────────────────────────────────
# /markets
# ─────────────────────────────────────────────────────────────
class TestMarkets:
    URL = "/markets"

    def test_200_no_filters(self, client):
        res = client.get(self.URL)
        assert res.status_code == 200
        assert "data" in res.json()

    def test_200_with_slug(self, client):
        res = client.get(self.URL, params={"slug": "btc-above-100k"})
        assert res.status_code == 200

    def test_200_with_closed_filter(self, client):
        res = client.get(self.URL, params={"closed": "true"})
        assert res.status_code == 200

    def test_422_invalid_closed_value(self, client):
        res = client.get(self.URL, params={"closed": "maybe"})
        assert res.status_code == 422


# ─────────────────────────────────────────────────────────────
# /data
# ─────────────────────────────────────────────────────────────
class TestData:
    URL = "/data"

    def test_200_returns_list(self, client_with_rows):
        rows = [{
            "token_id": "0xabc",
            "bucket": datetime(2026, 1, 1, 12, 0),
            "side": "bid",
            "avg_top_price": 0.52,
            "avg_top_size": 1000.0,
            "sample_count": 5,
        }]
        c = client_with_rows(rows)
        res = c.get(self.URL, params={
            "startTime": "2026-01-01T00:00:00",
            "endTime": "2026-01-02T00:00:00",
        })
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        assert res.json()[0]["token_id"] == "0xabc"

    def test_400_start_after_end(self, client):
        res = client.get(self.URL, params={
            "startTime": "2026-01-02T00:00:00",
            "endTime": "2026-01-01T00:00:00",
        })
        assert res.status_code == 400

    def test_422_missing_times(self, client):
        res = client.get(self.URL)
        assert res.status_code == 422

    def test_200_with_market_filter(self, client):
        res = client.get(self.URL, params={
            "startTime": "2026-01-01T00:00:00",
            "endTime": "2026-01-02T00:00:00",
            "market": "0xabc,0xdef",
        })
        assert res.status_code == 200

    def test_200_with_5s_interval(self, client):
        res = client.get(self.URL, params={
            "startTime": "2026-01-01T00:00:00",
            "endTime": "2026-01-02T00:00:00",
            "interval": "5s",
        })
        assert res.status_code == 200
