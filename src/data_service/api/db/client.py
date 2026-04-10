from __future__ import annotations

import os
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from clickhouse_connect.driver.client import Client

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _first_env(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "t", "yes", "y", "on"}


def _parse_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


@dataclass(frozen=True)
class ClickHouseSettings:
    """Connection settings for the API's ClickHouse client."""

    host: str
    port: int
    username: str
    password: str
    database: str
    secure: bool

    @classmethod
    def from_env(cls) -> "ClickHouseSettings":
        secure = _parse_bool(os.getenv("CLICKHOUSE_SECURE"), default=False)
        default_port = 8443 if secure else 8123

        return cls(
            host=_first_env("CLICKHOUSE_HOST", default="localhost") or "localhost",
            port=_parse_int(os.getenv("CLICKHOUSE_PORT"), default_port),
            username=_first_env("CLICKHOUSE_USER", "CLICKHOUSE_USERNAME", default="default")
            or "default",
            password=os.getenv("CLICKHOUSE_PASSWORD", "clickhouse"),
            database=_first_env("CLICKHOUSE_DB", "CLICKHOUSE_DATABASE", default="analytics")
            or "analytics",
            secure=secure,
        )


@dataclass(frozen=True)
class ClickHouseHealth:
    """Database health details used by the API health endpoint."""

    database: str
    table: str
    table_exists: bool


@lru_cache(maxsize=1)
def get_clickhouse_settings() -> ClickHouseSettings:
    """Load ClickHouse settings from the environment once per process."""

    return ClickHouseSettings.from_env()


@lru_cache(maxsize=1)
def get_clickhouse_client() -> "Client":
    """Create and cache a ClickHouse client for API queries."""

    try:
        import clickhouse_connect
    except ImportError as exc:
        raise RuntimeError(
            "clickhouse_connect is required to query ClickHouse from the API service."
        ) from exc

    settings = get_clickhouse_settings()
    return clickhouse_connect.get_client(
        host=settings.host,
        port=settings.port,
        username=settings.username,
        password=settings.password,
        database=settings.database,
        secure=settings.secure,
    )


def get_qualified_table_name(table_name: str) -> str:
    """Return a fully qualified table name using the configured database."""

    settings = get_clickhouse_settings()
    if not _IDENTIFIER_RE.fullmatch(settings.database):
        raise RuntimeError(
            f"Invalid ClickHouse database name configured: {settings.database!r}"
        )
    if not _IDENTIFIER_RE.fullmatch(table_name):
        raise RuntimeError(f"Invalid ClickHouse table name requested: {table_name!r}")
    return f"{settings.database}.{table_name}"


def get_clickhouse_health(table_name: str = "chainlink_prices") -> ClickHouseHealth:
    """Verify the API can reach ClickHouse and see the expected table."""

    settings = get_clickhouse_settings()
    client = get_clickhouse_client()

    try:
        result = client.query(
            """
            SELECT count()
            FROM system.tables
            WHERE database = %(database)s
              AND name = %(table)s
            """,
            parameters={
                "database": settings.database,
                "table": table_name,
            },
        )
    except Exception as exc:
        raise RuntimeError(f"ClickHouse health check failed: {exc}") from exc

    table_exists = bool(result.result_rows and result.result_rows[0][0])
    return ClickHouseHealth(
        database=settings.database,
        table=table_name,
        table_exists=table_exists,
    )
