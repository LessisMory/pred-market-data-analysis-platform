from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pandas as pd
import pytest

from api.fetchers import chainlink_fetcher as fetcher_module


def test_ensure_utc_normalizes_naive_and_aware_datetimes() -> None:
    naive = datetime(2024, 1, 1, 12, 0, 0)
    aware = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone(timedelta(hours=-5)))

    assert fetcher_module._ensure_utc(naive).tzinfo == timezone.utc
    assert fetcher_module._ensure_utc(aware).isoformat() == "2024-01-01T17:00:00+00:00"


def test_query_dataframe_uses_query_df_when_available(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    frame = pd.DataFrame([{"value": 1.0}])
    fake_client = SimpleNamespace(query_df=MagicMock(return_value=frame))
    monkeypatch.setattr(fetcher_module, "get_clickhouse_client", lambda: fake_client)

    result = fetcher_module._query_dataframe("SELECT 1", {"symbol": "BTC"})

    assert result is frame
    fake_client.query_df.assert_called_once_with("SELECT 1", parameters={"symbol": "BTC"})


def test_query_dataframe_falls_back_to_query_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_result = SimpleNamespace(
        result_rows=[("2024-01-01T00:00:00Z", 100.0, "BTC")],
        column_names=["update_timestamp", "value", "symbol"],
    )
    fake_client = SimpleNamespace(query_df=None, query=MagicMock(return_value=fake_result))
    monkeypatch.setattr(fetcher_module, "get_clickhouse_client", lambda: fake_client)

    frame = fetcher_module._query_dataframe("SELECT 1", {"symbol": "BTC"})

    assert list(frame.columns) == ["update_timestamp", "value", "symbol"]
    assert frame.iloc[0].to_dict() == {
        "update_timestamp": "2024-01-01T00:00:00Z",
        "value": 100.0,
        "symbol": "BTC",
    }


def test_fetch_chainlink_prices_cleans_results_and_builds_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source_frame = pd.DataFrame(
        [
            {
                "update_timestamp": "2024-01-01T00:00:00Z",
                "value": 101.25,
                "symbol": "BTC",
                "ignored": "x",
            },
            {
                "update_timestamp": "2024-01-01T00:01:00Z",
                "value": None,
                "symbol": "BTC",
                "ignored": "y",
            },
            {
                "update_timestamp": None,
                "value": 102.50,
                "symbol": "BTC",
                "ignored": "z",
            },
        ]
    )
    query_mock = MagicMock(return_value=source_frame)
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.chainlink_prices")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", query_mock)

    start = datetime(2024, 1, 1, 0, 0, 0)
    end = datetime(2024, 1, 1, 1, 0, 0, tzinfo=timezone.utc)
    frame = fetcher_module.fetch_chainlink_prices("  BTC  ", start, end, 50)

    assert list(frame.columns) == ["update_timestamp", "value", "symbol"]
    assert len(frame) == 1
    assert frame.iloc[0]["symbol"] == "BTC"
    assert frame.iloc[0]["value"] == 101.25
    assert str(frame.iloc[0]["update_timestamp"].tzinfo) == "UTC"

    query = query_mock.call_args.args[0]
    parameters = query_mock.call_args.args[1]
    assert "FROM analytics.chainlink_prices" in query
    assert "lower(symbol) = lower(%(symbol)s)" in query
    assert parameters["symbol"] == "BTC"
    assert parameters["start"].tzinfo == timezone.utc
    assert parameters["end"].tzinfo == timezone.utc
    assert parameters["limit"] == 50


def test_fetch_chainlink_prices_returns_empty_frame_with_expected_columns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.chainlink_prices")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", lambda *_args: pd.DataFrame())

    frame = fetcher_module.fetch_chainlink_prices(
        "BTC",
        datetime(2024, 1, 1, tzinfo=timezone.utc),
        datetime(2024, 1, 2, tzinfo=timezone.utc),
        10,
    )

    assert frame.empty
    assert list(frame.columns) == ["update_timestamp", "value", "symbol"]


def test_fetch_chainlink_prices_raises_on_missing_columns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    incomplete_frame = pd.DataFrame([{"update_timestamp": "2024-01-01T00:00:00Z", "value": 1.0}])
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.chainlink_prices")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", lambda *_args: incomplete_frame)

    with pytest.raises(fetcher_module.ChainlinkFetchError, match="missing expected columns: symbol"):
        fetcher_module.fetch_chainlink_prices(
            "BTC",
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            datetime(2024, 1, 2, tzinfo=timezone.utc),
            10,
        )


def test_fetch_chainlink_prices_wraps_query_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.chainlink_prices")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", MagicMock(side_effect=RuntimeError("boom")))

    with pytest.raises(fetcher_module.ChainlinkFetchError, match="ClickHouse query failed: boom"):
        fetcher_module.fetch_chainlink_prices(
            "BTC",
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            datetime(2024, 1, 2, tzinfo=timezone.utc),
            10,
        )


def test_fetch_latest_chainlink_prices_builds_limited_latest_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source_frame = pd.DataFrame(
        [
            {
                "update_timestamp": "2024-01-01T00:01:00Z",
                "value": 101.25,
                "symbol": "BTC",
            },
            {
                "update_timestamp": "2024-01-01T00:00:00Z",
                "value": 100.75,
                "symbol": "BTC",
            },
        ]
    )
    query_mock = MagicMock(return_value=source_frame)
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.chainlink_prices")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", query_mock)

    frame = fetcher_module.fetch_latest_chainlink_prices("  BTC  ", 2)

    assert list(frame.columns) == ["update_timestamp", "value", "symbol"]
    assert len(frame) == 2
    assert frame.iloc[0]["update_timestamp"].isoformat() == "2024-01-01T00:00:00+00:00"
    assert frame.iloc[1]["update_timestamp"].isoformat() == "2024-01-01T00:01:00+00:00"
    assert frame.iloc[0]["symbol"] == "BTC"
    assert frame.iloc[0]["value"] == 100.75
    assert frame.iloc[1]["value"] == 101.25
    assert str(frame.iloc[1]["update_timestamp"].tzinfo) == "UTC"

    query = query_mock.call_args.args[0]
    parameters = query_mock.call_args.args[1]
    assert "FROM analytics.chainlink_prices" in query
    assert "lower(symbol) = lower(%(symbol)s)" in query
    assert "ORDER BY update_timestamp DESC" in query
    assert "LIMIT %(limit)s" in query
    assert parameters == {"symbol": "BTC", "limit": 2}


def test_fetch_latest_chainlink_prices_wraps_query_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.chainlink_prices")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", MagicMock(side_effect=RuntimeError("boom")))

    with pytest.raises(fetcher_module.ChainlinkFetchError, match="ClickHouse query failed: boom"):
        fetcher_module.fetch_latest_chainlink_prices("BTC", 3)
