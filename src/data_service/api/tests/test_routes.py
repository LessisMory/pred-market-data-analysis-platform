from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from api.api import app
from api.db.client import ClickHouseHealth
from api.fetchers.chainlink_fetcher import ChainlinkFetchError
from api.routes import chainlink as chainlink_route
from api.routes import health as health_route


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_serialize_helpers_cover_non_standard_values() -> None:
    assert chainlink_route._serialize_datetime(None) is None
    assert chainlink_route._serialize_datetime("raw") == "raw"
    assert chainlink_route._serialize_record({"update_timestamp": None, "value": None, "symbol": None}) == {
        "update_timestamp": None,
        "value": None,
        "symbol": None,
    }


def test_chainlink_route_ensure_utc_normalizes_aware_datetimes() -> None:
    aware = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone(timedelta(hours=-5)))

    assert chainlink_route._ensure_utc(aware) == datetime(
        2024,
        1,
        1,
        17,
        0,
        0,
        tzinfo=timezone.utc,
    )


def test_chainlink_route_ensure_utc_assigns_utc_to_naive_datetimes() -> None:
    naive = datetime(2024, 1, 1, 12, 0, 0)

    assert chainlink_route._ensure_utc(naive) == datetime(
        2024,
        1,
        1,
        12,
        0,
        0,
        tzinfo=timezone.utc,
    )


@pytest.mark.parametrize(
    ("raw_symbol", "expected"),
    [
        (" btc ", "BTC/USD"),
        ("bnb/usd", "BNB/USD"),
        ("eth-usd", "ETH/USD"),
        ("sol_usd", "SOL/USD"),
        ("adausd", "ADA/USD"),
    ],
)
def test_normalize_symbol_accepts_user_friendly_inputs(
    raw_symbol: str,
    expected: str,
) -> None:
    assert chainlink_route._normalize_symbol(raw_symbol) == expected


def test_normalize_symbol_rejects_invalid_formats() -> None:
    with pytest.raises(chainlink_route.HTTPException, match="symbol format is invalid"):
        chainlink_route._normalize_symbol("btc/")


def test_resolve_time_window_supports_explicit_window() -> None:
    start = datetime(2024, 1, 1, 0, 0, 0)
    end = datetime(2024, 1, 1, 1, 0, 0, tzinfo=timezone.utc)

    resolved_start, resolved_end = chainlink_route._resolve_time_window(
        start,
        end,
        latest=False,
    )

    assert resolved_start == datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    assert resolved_end == end


def test_resolve_time_window_supports_latest_only_mode() -> None:
    start, end = chainlink_route._resolve_time_window(None, None, latest=True)

    assert start is None
    assert end is None


@pytest.mark.parametrize(
    ("start", "end", "latest", "expected_detail"),
    [
        (
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            None,
            False,
            "start and end must be provided together.",
        ),
        (
            None,
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            False,
            "start and end must be provided together.",
        ),
        (
            None,
            None,
            False,
            "Provide start and end, or use latest=true.",
        ),
        (
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            None,
            True,
            "latest cannot be combined with start or end.",
        ),
    ],
)
def test_resolve_time_window_rejects_conflicting_inputs(
    start: datetime | None,
    end: datetime | None,
    latest: bool,
    expected_detail: str,
) -> None:
    with pytest.raises(chainlink_route.HTTPException) as exc_info:
        chainlink_route._resolve_time_window(start, end, latest)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == expected_detail


def test_chainlink_prices_endpoint_returns_serialized_response(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    frame = pd.DataFrame(
        [
            {
                "update_timestamp": pd.Timestamp("2024-01-01T00:00:00Z"),
                "value": 101.25,
                "symbol": "BTC/USD",
            }
        ]
    )
    fetch_mock = MagicMock(return_value=frame)
    monkeypatch.setattr(chainlink_route, "fetch_chainlink_prices", fetch_mock)

    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "  BTC  ",
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-01T01:00:00Z",
            "limit": 5,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "symbol": "BTC/USD",
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-01T01:00:00Z",
        "count": 1,
        "data": [
            {
                "update_timestamp": "2024-01-01T00:00:00Z",
                "value": 101.25,
                "symbol": "BTC/USD",
            }
        ],
    }
    called = fetch_mock.call_args.kwargs
    assert called["symbol"] == "BTC/USD"
    assert called["limit"] == 5
    assert called["start"] == datetime(2024, 1, 1, 0, 0, tzinfo=timezone.utc)
    assert called["end"] == datetime(2024, 1, 1, 1, 0, tzinfo=timezone.utc)


def test_chainlink_prices_endpoint_supports_latest_mode_with_limit(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    frame = pd.DataFrame(
        [
            {
                "update_timestamp": pd.Timestamp("2024-01-03T09:29:00Z"),
                "value": 302.0,
                "symbol": "BNB/USD",
            },
            {
                "update_timestamp": pd.Timestamp("2024-01-03T09:30:00Z"),
                "value": 303.5,
                "symbol": "BNB/USD",
            }
        ]
    )
    fetch_mock = MagicMock(return_value=frame)
    monkeypatch.setattr(chainlink_route, "fetch_latest_chainlink_prices", fetch_mock)

    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "bnb",
            "latest": "true",
            "limit": 2,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "symbol": "BNB/USD",
        "start": None,
        "end": None,
        "count": 2,
        "data": [
            {
                "update_timestamp": "2024-01-03T09:29:00Z",
                "value": 302.0,
                "symbol": "BNB/USD",
            },
            {
                "update_timestamp": "2024-01-03T09:30:00Z",
                "value": 303.5,
                "symbol": "BNB/USD",
            }
        ],
    }
    fetch_mock.assert_called_once_with(symbol="BNB/USD", limit=2)


def test_chainlink_prices_endpoint_requires_explicit_window_or_latest(
    client: TestClient,
) -> None:
    response = client.get("/chainlink/prices", params={"symbol": "btc"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Provide start and end, or use latest=true."


def test_chainlink_prices_endpoint_rejects_blank_symbol(
    client: TestClient,
) -> None:
    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "   ",
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-01T01:00:00Z",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "symbol must not be blank."


def test_chainlink_prices_endpoint_rejects_invalid_time_window(
    client: TestClient,
) -> None:
    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "BTC",
            "start": "2024-01-01T01:00:00Z",
            "end": "2024-01-01T00:00:00Z",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "start must be earlier than end."


def test_chainlink_prices_endpoint_rejects_missing_end(
    client: TestClient,
) -> None:
    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "BTC",
            "start": "2024-01-01T00:00:00Z",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "start and end must be provided together."


def test_chainlink_prices_endpoint_rejects_conflicting_latest_and_start(
    client: TestClient,
) -> None:
    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "BTC",
            "start": "2024-01-01T00:00:00Z",
            "latest": "true",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "latest cannot be combined with start or end."


@pytest.mark.parametrize("limit", [0, 10001])
def test_chainlink_prices_endpoint_validates_limit_bounds(
    client: TestClient,
    limit: int,
) -> None:
    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "BTC",
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-01T01:00:00Z",
            "limit": limit,
        },
    )

    assert response.status_code == 422


def test_chainlink_prices_endpoint_surfaces_fetch_errors(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        chainlink_route,
        "fetch_chainlink_prices",
        MagicMock(side_effect=ChainlinkFetchError("query failed")),
    )

    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "BTC",
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-01T01:00:00Z",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to fetch Chainlink prices: query failed"


def test_chainlink_latest_endpoint_surfaces_fetch_errors(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        chainlink_route,
        "fetch_latest_chainlink_prices",
        MagicMock(side_effect=ChainlinkFetchError("query failed")),
    )

    response = client.get(
        "/chainlink/prices",
        params={
            "symbol": "BTC",
            "latest": "true",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to fetch Chainlink prices: query failed"


def test_health_endpoint_returns_ok(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        health_route,
        "get_clickhouse_health",
        MagicMock(
            return_value=ClickHouseHealth(
                database="analytics",
                table="chainlink_prices",
                table_exists=True,
            )
        ),
    )

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "analytics",
        "table": "chainlink_prices",
    }


def test_health_endpoint_reports_missing_table(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        health_route,
        "get_clickhouse_health",
        MagicMock(
            return_value=ClickHouseHealth(
                database="analytics",
                table="chainlink_prices",
                table_exists=False,
            )
        ),
    )

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "ClickHouse is reachable but table analytics.chainlink_prices was not found."
    )


def test_health_endpoint_reports_unreachable_clickhouse(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        health_route,
        "get_clickhouse_health",
        MagicMock(side_effect=RuntimeError("network down")),
    )

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["detail"] == "ClickHouse is unreachable: network down"
