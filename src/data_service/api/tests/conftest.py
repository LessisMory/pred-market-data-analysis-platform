from __future__ import annotations

import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[2]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from api.db import client as client_module


@pytest.fixture(autouse=True)
def clear_clickhouse_caches() -> None:
    """Keep cached settings and clients from leaking between tests."""

    client_module.get_clickhouse_settings.cache_clear()
    client_module.get_clickhouse_client.cache_clear()
    yield
    client_module.get_clickhouse_settings.cache_clear()
    client_module.get_clickhouse_client.cache_clear()
