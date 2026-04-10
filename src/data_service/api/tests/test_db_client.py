from __future__ import annotations

import builtins
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from api.db import client as client_module


def test_env_helpers_parse_values(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECOND", "fallback")
    monkeypatch.setenv("FIRST", "primary")

    assert client_module._first_env("FIRST", "SECOND") == "primary"
    assert client_module._first_env("MISSING", default="default") == "default"
    assert client_module._parse_bool("Yes") is True
    assert client_module._parse_bool(None, default=True) is True
    assert client_module._parse_int("bad-value", 8123) == 8123


def test_clickhouse_settings_from_env_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "CLICKHOUSE_HOST",
        "CLICKHOUSE_PORT",
        "CLICKHOUSE_USER",
        "CLICKHOUSE_USERNAME",
        "CLICKHOUSE_PASSWORD",
        "CLICKHOUSE_DB",
        "CLICKHOUSE_DATABASE",
        "CLICKHOUSE_SECURE",
    ):
        monkeypatch.delenv(name, raising=False)

    settings = client_module.ClickHouseSettings.from_env()

    assert settings == client_module.ClickHouseSettings(
        host="localhost",
        port=8123,
        username="default",
        password="clickhouse",
        database="analytics",
        secure=False,
    )


def test_clickhouse_settings_from_env_supports_aliases_and_secure_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CLICKHOUSE_HOST", "clickhouse")
    monkeypatch.setenv("CLICKHOUSE_USERNAME", "analytics_user")
    monkeypatch.setenv("CLICKHOUSE_PASSWORD", "secret")
    monkeypatch.setenv("CLICKHOUSE_DATABASE", "warehouse")
    monkeypatch.setenv("CLICKHOUSE_SECURE", "true")
    monkeypatch.delenv("CLICKHOUSE_PORT", raising=False)

    settings = client_module.ClickHouseSettings.from_env()

    assert settings == client_module.ClickHouseSettings(
        host="clickhouse",
        port=8443,
        username="analytics_user",
        password="secret",
        database="warehouse",
        secure=True,
    )


def test_get_clickhouse_client_builds_client_from_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}
    fake_client = object()

    def fake_get_client(**kwargs: object) -> object:
        captured.update(kwargs)
        return fake_client

    fake_module = SimpleNamespace(get_client=fake_get_client)
    monkeypatch.setitem(sys.modules, "clickhouse_connect", fake_module)
    monkeypatch.setenv("CLICKHOUSE_HOST", "clickhouse")
    monkeypatch.setenv("CLICKHOUSE_PORT", "9000")
    monkeypatch.setenv("CLICKHOUSE_USER", "reader")
    monkeypatch.setenv("CLICKHOUSE_PASSWORD", "secret")
    monkeypatch.setenv("CLICKHOUSE_DB", "analytics")
    monkeypatch.setenv("CLICKHOUSE_SECURE", "false")

    client = client_module.get_clickhouse_client()

    assert client is fake_client
    assert captured == {
        "host": "clickhouse",
        "port": 9000,
        "username": "reader",
        "password": "secret",
        "database": "analytics",
        "secure": False,
    }


def test_get_clickhouse_client_raises_when_dependency_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    real_import = builtins.__import__

    def fake_import(name: str, *args: object, **kwargs: object) -> object:
        if name == "clickhouse_connect":
            raise ImportError("missing dependency")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    monkeypatch.delitem(sys.modules, "clickhouse_connect", raising=False)

    with pytest.raises(RuntimeError, match="clickhouse_connect is required"):
        client_module.get_clickhouse_client()


def test_get_qualified_table_name_validates_identifiers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CLICKHOUSE_DB", "analytics")
    client_module.get_clickhouse_settings.cache_clear()
    assert client_module.get_qualified_table_name("chainlink_prices") == (
        "analytics.chainlink_prices"
    )

    monkeypatch.setenv("CLICKHOUSE_DB", "analytics-prod")
    client_module.get_clickhouse_settings.cache_clear()
    with pytest.raises(RuntimeError, match="Invalid ClickHouse database name"):
        client_module.get_qualified_table_name("chainlink_prices")

    monkeypatch.setenv("CLICKHOUSE_DB", "analytics")
    client_module.get_clickhouse_settings.cache_clear()
    with pytest.raises(RuntimeError, match="Invalid ClickHouse table name"):
        client_module.get_qualified_table_name("chainlink.prices")


def test_get_clickhouse_health_reports_table_status(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    query_mock = MagicMock(return_value=SimpleNamespace(result_rows=[(1,)]))
    fake_client = SimpleNamespace(query=query_mock)
    monkeypatch.setenv("CLICKHOUSE_DB", "analytics")
    monkeypatch.setattr(client_module, "get_clickhouse_client", lambda: fake_client)

    result = client_module.get_clickhouse_health("chainlink_prices")

    assert result == client_module.ClickHouseHealth(
        database="analytics",
        table="chainlink_prices",
        table_exists=True,
    )
    assert query_mock.call_args.kwargs["parameters"] == {
        "database": "analytics",
        "table": "chainlink_prices",
    }


def test_get_clickhouse_health_returns_false_when_table_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = SimpleNamespace(query=MagicMock(return_value=SimpleNamespace(result_rows=[(0,)])))
    monkeypatch.setattr(client_module, "get_clickhouse_client", lambda: fake_client)

    result = client_module.get_clickhouse_health("chainlink_prices")

    assert result.table_exists is False


def test_get_clickhouse_health_wraps_query_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = SimpleNamespace(query=MagicMock(side_effect=RuntimeError("boom")))
    monkeypatch.setattr(client_module, "get_clickhouse_client", lambda: fake_client)

    with pytest.raises(RuntimeError, match="ClickHouse health check failed: boom"):
        client_module.get_clickhouse_health("chainlink_prices")
