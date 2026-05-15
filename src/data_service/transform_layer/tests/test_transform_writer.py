import sys
import types
from datetime import datetime, timezone


asyncpg_stub = types.ModuleType("asyncpg")
asyncpg_stub.Pool = object
asyncpg_stub.create_pool = None


class ForeignKeyViolationError(Exception):
    pass


asyncpg_stub.exceptions = types.SimpleNamespace(ForeignKeyViolationError=ForeignKeyViolationError)
sys.modules.setdefault("asyncpg", asyncpg_stub)

aiokafka_stub = types.ModuleType("aiokafka")
aiokafka_stub.AIOKafkaConsumer = object
sys.modules.setdefault("aiokafka", aiokafka_stub)

from transform_layer.config import load_settings
from transform_layer.transform_writer import TransformWriter


def test_postgres_settings_default_trade_table(monkeypatch):
    monkeypatch.delenv("ORDER_BOOK_TRADES_TABLE", raising=False)

    settings = load_settings()

    assert settings.postgres.order_book_trades_table == "order_book_trades"


def test_to_records_builds_order_book_trade_row():
    settings = load_settings()
    writer = TransformWriter(settings)

    records = writer._to_records(
        {
            "payload": {
                "market": "0xdc2dc0399bf6584e9b502ca51d61a8a9570b731e4e5b4cc087ab9b7230405710",
                "asset_id": "7624450354679081382276088807478298687015500496416261095206282724935410207427",
                "price": "0.57",
                "size": "9",
                "fee_rate_bps": "0",
                "side": "BUY",
                "timestamp": "1764565225250",
                "event_type": "last_trade_price",
                "transaction_hash": "0x47aca76b810ccd72ad9cb596903059b5b0a34bfaf7ec9a872e5b4e4e75911a52",
            }
        }
    )

    assert len(records) == 1

    table, row = records[0]
    assert table == "order_book_trades"
    assert row[0] == "0xdc2dc0399bf6584e9b502ca51d61a8a9570b731e4e5b4cc087ab9b7230405710"
    assert row[1] == "7624450354679081382276088807478298687015500496416261095206282724935410207427"
    assert row[2] == 0.57
    assert row[3] == 9.0
    assert row[4] == 0
    assert row[5] == "BUY"
    assert row[6] == "0x47aca76b810ccd72ad9cb596903059b5b0a34bfaf7ec9a872e5b4e4e75911a52"
    assert row[7] == datetime.fromtimestamp(1764565225250 / 1000, tz=timezone.utc)


def test_to_records_drops_incomplete_order_book_trade():
    settings = load_settings()
    writer = TransformWriter(settings)

    records = writer._to_records(
        {
            "market": "market-id",
            "asset_id": "token-id",
            "price": "0.57",
            "size": "9",
            "side": "BUY",
            "timestamp": "1764565225250",
            "event_type": "last_trade_price",
        }
    )

    assert records == []
