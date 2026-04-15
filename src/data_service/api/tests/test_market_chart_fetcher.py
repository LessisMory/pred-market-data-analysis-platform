from __future__ import annotations

from unittest.mock import MagicMock

import pandas as pd
import pytest

from api.fetchers import market_chart_fetcher as fetcher_module


def _make_chart_row(**overrides: object) -> dict[str, object]:
    row = {column: None for column in fetcher_module.EXPECTED_COLUMNS}
    row.update(
        {
            "slug": "btc-updown-15m-1764565200",
            "market_id": "0xmarket",
            "asset_id": "123",
            "timestamp": "2025-12-01T05:00:23Z",
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
            "theoretical_price": 0.58,
            "best_price_spread": 0.01,
            "orderbook_imbalance": 0.53,
        }
    )
    row.update(overrides)
    return row


def test_fetch_market_depth_volume_chart_builds_query_and_cleans_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source_frame = pd.DataFrame(
        [
            _make_chart_row(
                timestamp="2025-12-01T05:00:24Z",
                buy_trade_size="3.5",
            ),
            _make_chart_row(
                timestamp="2025-12-01T05:00:23Z",
                buy_trade_size="2.0",
            ),
        ]
    )
    query_mock = MagicMock(return_value=source_frame)
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.books_wide_df_enriched")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", query_mock)

    frame = fetcher_module.fetch_market_depth_volume_chart(
        " 0xmarket ",
        " 123 ",
        250,
    )

    assert list(frame.columns) == fetcher_module.EXPECTED_COLUMNS
    assert len(frame) == 2
    assert frame.iloc[0]["timestamp"].isoformat() == "2025-12-01T05:00:23+00:00"
    assert frame.iloc[1]["timestamp"].isoformat() == "2025-12-01T05:00:24+00:00"
    assert frame.iloc[0]["buy_trade_size"] == 2.0
    assert frame.iloc[1]["buy_trade_size"] == 3.5

    query = query_mock.call_args.args[0]
    parameters = query_mock.call_args.args[1]
    assert "FROM analytics.books_wide_df_enriched" in query
    assert "WHERE market = %(market_id)s" in query
    assert "AND asset_id = %(asset_id)s" in query
    assert "ORDER BY timestamp DESC" in query
    assert parameters["market_id"] == "0xmarket"
    assert parameters["asset_id"] == "123"
    assert parameters["limit"] == 250


def test_fetch_market_depth_volume_chart_returns_empty_frame_with_expected_columns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.books_wide_df_enriched")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", lambda *_args: pd.DataFrame())

    frame = fetcher_module.fetch_market_depth_volume_chart(
        "0xmarket",
        "123",
        10,
    )

    assert frame.empty
    assert list(frame.columns) == fetcher_module.EXPECTED_COLUMNS


def test_fetch_market_depth_volume_chart_raises_on_missing_columns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    incomplete_frame = pd.DataFrame([{"slug": "btc-updown-15m-1764565200"}])
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.books_wide_df_enriched")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", lambda *_args: incomplete_frame)

    with pytest.raises(fetcher_module.MarketChartFetchError, match="missing expected columns"):
        fetcher_module.fetch_market_depth_volume_chart(
            "0xmarket",
            "123",
            10,
        )


def test_fetch_market_depth_volume_chart_wraps_query_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(fetcher_module, "get_qualified_table_name", lambda _name: "analytics.books_wide_df_enriched")
    monkeypatch.setattr(fetcher_module, "_query_dataframe", MagicMock(side_effect=RuntimeError("boom")))

    with pytest.raises(fetcher_module.MarketChartFetchError, match="ClickHouse query failed: boom"):
        fetcher_module.fetch_market_depth_volume_chart(
            "0xmarket",
            "123",
            10,
        )


def test_fetch_available_markets_returns_distinct_market_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source_frame = pd.DataFrame(
        [
            {
                "slug": "btc-updown-15m-1764565200",
                "market_id": "0xmarket",
                "asset_id": "123",
                "market_name": "Bitcoin Up or Down",
                "token_name": "Up",
                "ignored": "x",
            },
            {
                "slug": "eth-updown-15m-1764565200",
                "market_id": "0xmarket-2",
                "asset_id": "456",
                "market_name": "Ethereum Up or Down",
                "token_name": "Down",
                "ignored": "y",
            },
        ]
    )
    query_mock = MagicMock(return_value=source_frame)
    monkeypatch.setattr(
        fetcher_module,
        "get_qualified_table_name",
        lambda _name: "analytics.books_wide_df_enriched",
    )
    monkeypatch.setattr(fetcher_module, "_query_dataframe", query_mock)

    frame = fetcher_module.fetch_available_markets(25)

    assert list(frame.columns) == fetcher_module.MARKET_METADATA_COLUMNS
    assert frame.to_dict(orient="records") == [
        {
            "slug": "btc-updown-15m-1764565200",
            "market_id": "0xmarket",
            "asset_id": "123",
            "market_name": "Bitcoin Up or Down",
            "token_name": "Up",
        },
        {
            "slug": "eth-updown-15m-1764565200",
            "market_id": "0xmarket-2",
            "asset_id": "456",
            "market_name": "Ethereum Up or Down",
            "token_name": "Down",
        },
    ]

    query = query_mock.call_args.args[0]
    parameters = query_mock.call_args.args[1]
    assert "SELECT DISTINCT" in query
    assert "market AS market_id" in query
    assert "LIMIT %(limit)s" in query
    assert parameters == {"limit": 25}
