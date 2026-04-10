from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from api.api import app
from api.fetchers.market_chart_fetcher import MarketChartFetchError
from api.routes import markets as markets_route


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_market_route_ensure_utc_assigns_utc_to_naive_datetimes() -> None:
    naive = datetime(2025, 12, 1, 5, 0, 0)

    assert markets_route._ensure_utc(naive) == datetime(
        2025,
        12,
        1,
        5,
        0,
        0,
        tzinfo=timezone.utc,
    )


def test_normalize_market_id_rejects_blank_values() -> None:
    with pytest.raises(markets_route.HTTPException, match="market_id must not be blank"):
        markets_route._normalize_market_id("   ")


def test_normalize_asset_id_rejects_blank_values() -> None:
    with pytest.raises(markets_route.HTTPException, match="asset_id must not be blank"):
        markets_route._normalize_asset_id("   ")


def test_available_markets_endpoint_returns_market_metadata(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    frame = pd.DataFrame(
        [
            {
                "slug": "btc-updown-15m-1764565200",
                "market_id": "0xmarket",
                "asset_id": "123",
                "market_name": "Bitcoin Up or Down",
                "token_name": "Up",
            },
            {
                "slug": "eth-updown-15m-1764565200",
                "market_id": "0xmarket2",
                "asset_id": "456",
                "market_name": "Ethereum Up or Down",
                "token_name": "Down",
            },
        ]
    )
    fetch_mock = MagicMock(return_value=frame)
    monkeypatch.setattr(markets_route, "fetch_available_markets", fetch_mock)

    response = client.get("/markets", params={"limit": 50})

    assert response.status_code == 200
    assert response.json() == {
        "count": 2,
        "data": [
            {
                "slug": "btc-updown-15m-1764565200",
                "market_id": "0xmarket",
                "asset_id": "123",
                "market_name": "Bitcoin Up or Down",
                "token_name": "Up",
            },
            {
                "slug": "eth-updown-15m-1764565200",
                "market_id": "0xmarket2",
                "asset_id": "456",
                "market_name": "Ethereum Up or Down",
                "token_name": "Down",
            },
        ],
    }
    fetch_mock.assert_called_once_with(limit=50)


def test_market_depth_volume_chart_endpoint_returns_chart_ready_response(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    frame = pd.DataFrame(
        [
            {
                "slug": "btc-updown-15m-1764565200",
                "market_id": "0xmarket",
                "asset_id": "123",
                "timestamp": pd.Timestamp("2025-12-01T05:00:23Z"),
                "buy_trade_vwap": 0.44,
                "buy_trade_size": 2.27,
                "buy_trade_count": 1,
                "buy_trade_nominal_value": 1.0,
                "sell_trade_vwap": None,
                "sell_trade_size": 0.0,
                "sell_trade_count": 0,
                "sell_trade_nominal_value": 0.0,
                "bid_L1_price": 0.43,
                "bid_L1_size": 1568.0,
                "bid_L2_price": 0.42,
                "bid_L2_size": 202.0,
                "ask_L1_price": 0.44,
                "ask_L1_size": 2.72,
                "ask_L2_price": 0.46,
                "ask_L2_size": 140.0,
                "market_name": "Bitcoin Up or Down",
                "token_name": "Up",
                "l1_passive_mid_price": 0.44,
                "best_price_spread": 0.01,
                "orderbook_imbalance": 0.53,
            }
        ]
    )
    fetch_mock = MagicMock(return_value=frame)
    monkeypatch.setattr(markets_route, "fetch_market_depth_volume_chart", fetch_mock)

    response = client.get(
        "/markets/depth-volume-chart",
        params={
            "market_id": " 0xmarket ",
            "asset_id": " 123 ",
            "limit": 50,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "slug": "btc-updown-15m-1764565200",
        "count": 1,
        "market_id": "0xmarket",
        "asset_id": "123",
        "market_name": "Bitcoin Up or Down",
        "token_name": "Up",
        "data": [
            {
                "slug": "btc-updown-15m-1764565200",
                "timestamp": "2025-12-01T05:00:23Z",
                "trade_volume": {
                    "buy": {
                        "vwap": 0.44,
                        "size": 2.27,
                        "count": 1,
                        "nominal_value": 1.0,
                    },
                    "sell": {
                        "vwap": None,
                        "size": 0.0,
                        "count": 0,
                        "nominal_value": 0.0,
                    },
                    "total_size": 2.27,
                    "total_count": 1,
                    "total_nominal_value": 1.0,
                },
                "order_book_depth": {
                    "bids": [
                        {
                            "level": 1,
                            "price": 0.43,
                            "size": 1568.0,
                            "cumulative_size": 1568.0,
                        },
                        {
                            "level": 2,
                            "price": 0.42,
                            "size": 202.0,
                            "cumulative_size": 1770.0,
                        },
                    ],
                    "asks": [
                        {
                            "level": 1,
                            "price": 0.44,
                            "size": 2.72,
                            "cumulative_size": 2.72,
                        },
                        {
                            "level": 2,
                            "price": 0.46,
                            "size": 140.0,
                            "cumulative_size": 142.72,
                        },
                    ],
                    "total_bid_size": 1770.0,
                    "total_ask_size": 142.72,
                },
                "mid_price": 0.44,
                "spread": 0.01,
                "imbalance": 0.53,
            }
        ],
    }
    fetch_mock.assert_called_once_with(
        market_id="0xmarket",
        asset_id="123",
        limit=50,
    )


def test_market_depth_volume_chart_endpoint_uses_default_limit(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(markets_route, "fetch_market_depth_volume_chart", MagicMock(return_value=pd.DataFrame()))

    response = client.get(
        "/markets/depth-volume-chart",
        params={
            "market_id": "0xmarket",
            "asset_id": "123",
        },
    )

    assert response.status_code == 200
    markets_route.fetch_market_depth_volume_chart.assert_called_once_with(
        market_id="0xmarket",
        asset_id="123",
        limit=100,
    )


def test_market_depth_volume_chart_endpoint_rejects_blank_market_id(
    client: TestClient,
) -> None:
    response = client.get(
        "/markets/depth-volume-chart",
        params={
            "market_id": "   ",
            "asset_id": "123",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "market_id must not be blank."


def test_market_depth_volume_chart_endpoint_rejects_blank_asset_id(
    client: TestClient,
) -> None:
    response = client.get(
        "/markets/depth-volume-chart",
        params={
            "market_id": "0xmarket",
            "asset_id": "   ",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "asset_id must not be blank."


@pytest.mark.parametrize("limit", [0, 10001])
def test_market_depth_volume_chart_endpoint_validates_limit_bounds(
    client: TestClient,
    limit: int,
) -> None:
    response = client.get(
        "/markets/depth-volume-chart",
        params={
            "market_id": "0xmarket",
            "asset_id": "123",
            "limit": limit,
        },
    )

    assert response.status_code == 422


def test_market_depth_volume_chart_endpoint_surfaces_fetch_errors(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        markets_route,
        "fetch_market_depth_volume_chart",
        MagicMock(side_effect=MarketChartFetchError("query failed")),
    )

    response = client.get(
        "/markets/depth-volume-chart",
        params={
            "market_id": "0xmarket",
            "asset_id": "123",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to fetch market chart data: query failed"


def test_available_markets_endpoint_surfaces_fetch_errors(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        markets_route,
        "fetch_available_markets",
        MagicMock(side_effect=MarketChartFetchError("query failed")),
    )

    response = client.get("/markets")

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to fetch available markets: query failed"
