import asyncio
import datetime as dt
import json
import signal
from types import SimpleNamespace
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

import stream


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class RecordingPublisher:
    def __init__(self, stop_event: asyncio.Event, stop_after: Optional[int] = None):
        self.stop_event = stop_event
        self.stop_after = stop_after
        self.published = []

    async def publish(self, channel, payload):
        self.published.append((channel, payload))
        if self.stop_after is not None and len(self.published) >= self.stop_after:
            self.stop_event.set()


class FakeWebSocket:
    def __init__(self, incoming_messages):
        self.incoming_messages = list(incoming_messages)
        self.sent_messages = []
        self.ping_count = 0

    async def send(self, message):
        self.sent_messages.append(message)

    async def recv(self):
        if not self.incoming_messages:
            raise AssertionError("recv called without a queued message")

        next_message = self.incoming_messages.pop(0)
        if isinstance(next_message, Exception):
            raise next_message
        return next_message

    async def ping(self):
        self.ping_count += 1


class FakeConnection:
    def __init__(self, websocket):
        self.websocket = websocket

    async def __aenter__(self):
        return self.websocket

    async def __aexit__(self, exc_type, exc, tb):
        return False


def make_fake_datetime(*timestamps):
    class FakeDatetime:
        values = iter(timestamps)

        @classmethod
        def now(cls):
            return next(cls.values)

    return FakeDatetime


def test_fetch_events_paginates_until_empty(monkeypatch):
    batches = [[{"id": 1}], [{"id": 2}], []]
    calls = []

    def fake_get(url, params, timeout):
        calls.append({"url": url, "params": dict(params), "timeout": timeout})
        return FakeResponse(batches.pop(0))

    monkeypatch.setattr(stream.requests, "get", fake_get)

    result = stream.fetch_events(tag_id="102467", closed="false")

    assert result == [{"id": 1}, {"id": 2}]
    assert [call["params"]["offset"] for call in calls] == [0, 500, 1000]
    assert all(call["params"]["tag_id"] == "102467" for call in calls)


def test_collect_markets_for_asset_filters_and_sorts():
    events = [
        {
            "slug": "parent-btc-1710000300",
            "markets": [
                {"slug": "btc-no-timestamp", "clobTokenIds": ["7", 8]},
                {"slug": "btc-up-1710000200", "clobTokenIds": "[1, 2]"},
                {"slug": "eth-up-1710000100", "clobTokenIds": ["3"]},
                {"clobTokenIds": ["9"]},
                {"slug": "btc-bad-1710000400", "clobTokenIds": "not-json"},
            ],
        }
    ]

    markets = stream.collect_markets_for_asset(events, "btc")

    assert [market.slug for market in markets] == [
        "btc-no-timestamp",
        "btc-up-1710000200",
        "parent-btc-1710000300",
    ]
    assert [market.asset_ids for market in markets] == [["7", "8"], ["1", "2"], ["9"]]


def test_helper_functions_normalize_metadata_and_market_timing(monkeypatch):
    payload = {"price": 42}
    meta = stream._ensure_meta(payload)
    payload_with_meta = {"meta": {"source": "existing"}}

    assert stream._extract_timestamp("") is None
    assert stream._extract_timestamp("btc-up-1710000200") == 1710000200
    assert stream._extract_timestamp("btc-live") is None
    assert stream._normalise_token_ids([1, "2"]) == ["1", "2"]
    assert stream._normalise_token_ids('["3", 4]') == ["3", "4"]
    assert stream._normalise_token_ids('{"not": "a-list"}') is None
    assert stream._normalise_token_ids("not-json") is None
    assert meta == {}
    assert payload["meta"] is meta
    assert stream._ensure_meta(payload_with_meta) is payload_with_meta["meta"]
    assert stream._ensure_meta(["not", "a", "dict"]) is None

    monkeypatch.setattr(stream.time, "time", lambda: 1_000.0)

    future_market = stream.MarketDescriptor("btc-future", ["1"], 1_000 + stream.MARKET_START_LEAD_SECONDS + 25)
    active_market = stream.MarketDescriptor("btc-active", ["1"], 1_000 + stream.MARKET_START_LEAD_SECONDS - 5)
    expired_market = stream.MarketDescriptor("btc-expired", ["1"], 1_000 - stream.MARKET_DURATION_SECONDS - 5)
    timeless_market = stream.MarketDescriptor("btc-always-on", ["1"], None)

    assert stream._classify_market_window(future_market) == "future"
    assert stream._classify_market_window(active_market) == "active"
    assert stream._classify_market_window(expired_market) == "expired"
    assert stream._classify_market_window(timeless_market) == "active"
    assert stream._seconds_until_market_start(future_market) == 25.0
    assert stream._seconds_until_market_start(timeless_market) == 0.0


@pytest.mark.asyncio
async def test_redis_publisher_publish_and_close(monkeypatch):
    client = MagicMock()
    client.publish = AsyncMock()
    client.close = AsyncMock()
    client.connection_pool = SimpleNamespace(disconnect=AsyncMock())

    monkeypatch.setattr(stream.redis, "from_url", lambda *args, **kwargs: client)

    publisher = stream.RedisPublisher("redis://test")
    await publisher.publish("prices", {"value": 123})
    await publisher.close()

    client.publish.assert_awaited_once_with("prices", json.dumps({"value": 123}))
    client.close.assert_awaited_once()
    client.connection_pool.disconnect.assert_awaited_once()


@pytest.mark.asyncio
async def test_redis_publisher_logs_publish_errors(monkeypatch):
    client = MagicMock()
    client.publish = AsyncMock(side_effect=RuntimeError("boom"))
    client.close = AsyncMock()
    client.connection_pool = SimpleNamespace(disconnect=AsyncMock())
    logged_errors = []

    monkeypatch.setattr(stream.redis, "from_url", lambda *args, **kwargs: client)
    monkeypatch.setattr(stream.logger, "error", lambda *args: logged_errors.append(args))

    publisher = stream.RedisPublisher("redis://test")
    await publisher.publish("prices", "raw-message")

    assert logged_errors == [("Failed to publish to %s: %s", "prices", client.publish.side_effect)]


@pytest.mark.asyncio
async def test_populate_market_queue_enqueues_matching_markets(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()

    def fake_fetch_events(tag_id, closed):
        assert tag_id == "102467"
        assert closed == "false"
        return [
            {
                "slug": "btc-parent-1710000200",
                "markets": [{"slug": "btc-up-1710000200", "clobTokenIds": ["1", "2"]}],
            }
        ]

    async def fake_sleep(_seconds):
        stop_event.set()

    monkeypatch.setattr(stream, "fetch_events", fake_fetch_events)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.populate_market_queue(
        "btc",
        {"keyword": "btc", "tag_id": "102467"},
        queue,
        stop_event,
        refresh_interval=0.0,
        min_queue_size=1,
    )

    market = queue.get_nowait()
    assert market.slug == "btc-up-1710000200"
    assert market.asset_ids == ["1", "2"]


@pytest.mark.asyncio
async def test_populate_market_queue_waits_when_buffer_is_full(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()
    queue.put_nowait(stream.MarketDescriptor("btc-buffered", ["1"], None))
    fetch_calls = []

    async def fake_sleep(_seconds):
        stop_event.set()

    def fake_fetch_events(*args, **kwargs):
        fetch_calls.append((args, kwargs))
        return []

    monkeypatch.setattr(stream, "fetch_events", fake_fetch_events)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.populate_market_queue(
        "btc",
        {"keyword": "btc", "tag_id": "102467"},
        queue,
        stop_event,
        refresh_interval=0.0,
        min_queue_size=1,
    )

    assert fetch_calls == []


@pytest.mark.asyncio
async def test_populate_market_queue_handles_fetch_failures(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()
    sleep_calls = []

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)
        stop_event.set()

    def fake_fetch_events(*args, **kwargs):
        raise RuntimeError("fetch failed")

    monkeypatch.setattr(stream, "fetch_events", fake_fetch_events)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.populate_market_queue(
        "btc",
        {"keyword": "btc", "tag_id": "102467"},
        queue,
        stop_event,
        refresh_interval=3.0,
        min_queue_size=1,
    )

    assert queue.empty()
    assert sleep_calls == [3.0]


@pytest.mark.asyncio
async def test_populate_market_queue_skips_duplicate_markets(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()
    fetch_calls = []

    def fake_fetch_events(*args, **kwargs):
        fetch_calls.append((args, kwargs))
        return [
            {
                "slug": "btc-parent-1710000200",
                "markets": [{"slug": "btc-up-1710000200", "clobTokenIds": ["1", "2"]}],
            }
        ]

    async def fake_sleep(_seconds):
        stop_event.set()

    monkeypatch.setattr(stream, "fetch_events", fake_fetch_events)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.populate_market_queue(
        "btc",
        {"keyword": "btc", "tag_id": "102467"},
        queue,
        stop_event,
        refresh_interval=0.0,
        min_queue_size=2,
    )

    market = queue.get_nowait()
    assert market.slug == "btc-up-1710000200"
    assert fetch_calls and len(fetch_calls) == 2


@pytest.mark.asyncio
async def test_stream_single_market_enriches_and_wraps_payloads(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=2)
    websocket = FakeWebSocket(
        [
            "PONG",
            json.dumps({"price": 123}),
            json.dumps(["raw", "payload"]),
            "not-json",
        ]
    )

    monkeypatch.setattr(
        stream.websockets,
        "connect",
        lambda *args, **kwargs: FakeConnection(websocket),
    )

    market = stream.MarketDescriptor("btc-up-1710000200", ["11", "22"], 1710000200)

    await stream.stream_single_market(
        "btc",
        market,
        stop_event,
        publisher,
        inactivity_timeout=1.0,
        ping_interval=999.0,
        max_retries=1,
    )

    assert json.loads(websocket.sent_messages[0]) == {
        "assets_ids": ["11", "22"],
        "type": "market",
    }
    assert publisher.published[0][0] == f"{stream.MARKET_REDIS_CHANNEL_PREFIX}:btc:{market.slug}"
    assert publisher.published[0][1]["meta"]["market_slug"] == market.slug
    assert publisher.published[0][1]["meta"]["asset"] == "btc"
    assert publisher.published[1][1] == {
        "raw_payload": ["raw", "payload"],
        "meta": {
            "market_slug": market.slug,
            "asset": "btc",
            "note": "wrapped_non_dict_payload",
        },
    }


@pytest.mark.asyncio
async def test_stream_single_market_pings_and_skips_non_json_messages(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=1)
    websocket = FakeWebSocket(["not-json", json.dumps({"price": 321})])
    start = dt.datetime(2026, 1, 1, 12, 0, 0)

    monkeypatch.setattr(
        stream.websockets,
        "connect",
        lambda *args, **kwargs: FakeConnection(websocket),
    )
    monkeypatch.setattr(
        stream.dt,
        "datetime",
        make_fake_datetime(
            start,
            start + dt.timedelta(seconds=11),
            start + dt.timedelta(seconds=12),
            start + dt.timedelta(seconds=13),
        ),
    )

    await stream.stream_single_market(
        "btc",
        stream.MarketDescriptor("btc-live", ["1"], None),
        stop_event,
        publisher,
        inactivity_timeout=1.0,
        ping_interval=5.0,
        max_retries=1,
    )

    assert websocket.sent_messages[1] == "PING"
    assert publisher.published[0][1]["meta"]["asset"] == "btc"


@pytest.mark.asyncio
async def test_stream_single_market_retries_after_inactivity_timeout(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=1)
    first_websocket = FakeWebSocket([asyncio.TimeoutError()])
    second_websocket = FakeWebSocket([json.dumps({"price": 99})])
    connections = iter([FakeConnection(first_websocket), FakeConnection(second_websocket)])
    sleep_calls = []
    real_sleep = asyncio.sleep

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)
        await real_sleep(0)

    monkeypatch.setattr(stream.websockets, "connect", lambda *args, **kwargs: next(connections))
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.stream_single_market(
        "btc",
        stream.MarketDescriptor("btc-live", ["1"], None),
        stop_event,
        publisher,
        inactivity_timeout=1.0,
        ping_interval=999.0,
        max_retries=2,
    )

    assert sleep_calls == [1]
    assert publisher.published[0][1]["meta"]["asset"] == "btc"


@pytest.mark.asyncio
async def test_stream_single_market_retries_after_connection_closed(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=1)
    websocket = FakeWebSocket([json.dumps({"price": 77})])
    sleep_calls = []
    real_sleep = asyncio.sleep
    attempt_count = {"value": 0}

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)
        await real_sleep(0)

    def fake_connect(*args, **kwargs):
        attempt_count["value"] += 1
        if attempt_count["value"] == 1:
            raise RuntimeError("closed")
        return FakeConnection(websocket)

    monkeypatch.setattr(stream.websockets, "ConnectionClosed", RuntimeError)
    monkeypatch.setattr(stream.websockets, "connect", fake_connect)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.stream_single_market(
        "btc",
        stream.MarketDescriptor("btc-live", ["1"], None),
        stop_event,
        publisher,
        inactivity_timeout=1.0,
        ping_interval=999.0,
        max_retries=2,
    )

    assert sleep_calls == [2]
    assert publisher.published[0][1]["meta"]["asset"] == "btc"


@pytest.mark.asyncio
async def test_stream_single_market_logs_generic_errors_and_gives_up(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event)
    sleep_calls = []
    logged_errors = []
    logged_warnings = []

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)

    def fake_connect(*args, **kwargs):
        raise ValueError("boom")

    monkeypatch.setattr(stream.websockets, "connect", fake_connect)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(stream.logger, "error", lambda *args: logged_errors.append(args))
    monkeypatch.setattr(stream.logger, "warning", lambda *args: logged_warnings.append(args))

    await stream.stream_single_market(
        "btc",
        stream.MarketDescriptor("btc-live", ["1"], None),
        stop_event,
        publisher,
        inactivity_timeout=1.0,
        ping_interval=999.0,
        max_retries=1,
    )

    assert sleep_calls == [5]
    assert logged_errors[0][0].startswith("Error streaming market")
    assert logged_warnings[-1][0].startswith("Max retries reached for market")


@pytest.mark.asyncio
async def test_stream_markets_for_asset_skips_expired_market(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()
    await queue.put(stream.MarketDescriptor("btc-expired", ["1"], 1))
    await queue.put(stream.MarketDescriptor("btc-active", ["2"], None))

    calls = []
    real_wait_for = asyncio.wait_for

    async def fake_stream_single_market(
        asset_name,
        market,
        stop_event_arg,
        publisher,
        inactivity_timeout=10.0,
        max_retries=stream.MARKET_STREAM_RETRIES,
    ):
        del publisher, max_retries
        calls.append((asset_name, market.slug, inactivity_timeout))
        stop_event_arg.set()

    async def fast_wait_for(awaitable, timeout):
        capped_timeout = 0.01 if timeout == 1.0 else timeout
        return await real_wait_for(awaitable, timeout=capped_timeout)

    monkeypatch.setattr(stream, "stream_single_market", fake_stream_single_market)
    monkeypatch.setattr(stream.asyncio, "wait_for", fast_wait_for)

    await real_wait_for(
        stream.stream_markets_for_asset(
            "btc",
            queue,
            stop_event,
            publisher=object(),
            inactivity_timeout=3.5,
        ),
        timeout=1.0,
    )

    assert calls == [("btc", "btc-active", 3.5)]
    assert queue.empty()


@pytest.mark.asyncio
async def test_stream_markets_for_asset_waits_for_future_market_before_start(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()
    await queue.put(stream.MarketDescriptor("btc-future", ["1"], None))
    calls = []
    real_wait_for = asyncio.wait_for

    async def fake_stream_single_market(
        asset_name,
        market,
        stop_event_arg,
        publisher,
        inactivity_timeout=10.0,
        max_retries=stream.MARKET_STREAM_RETRIES,
    ):
        del publisher, max_retries
        calls.append((asset_name, market.slug, inactivity_timeout))
        stop_event_arg.set()

    async def fake_wait_for(awaitable, timeout):
        if timeout == 5.0:
            if hasattr(awaitable, "close"):
                awaitable.close()
            raise asyncio.TimeoutError
        capped_timeout = 0.01 if timeout == 1.0 else timeout
        return await real_wait_for(awaitable, timeout=capped_timeout)

    monkeypatch.setattr(stream, "_seconds_until_market_start", lambda market: 5.0)
    monkeypatch.setattr(stream, "stream_single_market", fake_stream_single_market)
    monkeypatch.setattr(stream.asyncio, "wait_for", fake_wait_for)

    await real_wait_for(
        stream.stream_markets_for_asset(
            "btc",
            queue,
            stop_event,
            publisher=object(),
            inactivity_timeout=4.0,
        ),
        timeout=1.0,
    )

    assert calls == [("btc", "btc-future", 4.0)]


@pytest.mark.asyncio
async def test_stream_markets_for_asset_stops_before_delayed_market_starts(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()
    await queue.put(stream.MarketDescriptor("btc-future", ["1"], None))
    real_wait_for = asyncio.wait_for
    started_markets = []

    async def fake_stream_single_market(*args, **kwargs):
        started_markets.append((args, kwargs))

    async def fake_wait_for(awaitable, timeout):
        if timeout == 5.0:
            stop_event.set()
            return await awaitable
        capped_timeout = 0.01 if timeout == 1.0 else timeout
        return await real_wait_for(awaitable, timeout=capped_timeout)

    monkeypatch.setattr(stream, "_seconds_until_market_start", lambda market: 5.0)
    monkeypatch.setattr(stream, "stream_single_market", fake_stream_single_market)
    monkeypatch.setattr(stream.asyncio, "wait_for", fake_wait_for)

    await real_wait_for(
        stream.stream_markets_for_asset(
            "btc",
            queue,
            stop_event,
            publisher=object(),
            inactivity_timeout=4.0,
        ),
        timeout=1.0,
    )

    assert started_markets == []


@pytest.mark.asyncio
async def test_stream_markets_for_asset_logs_task_errors(monkeypatch):
    stop_event = asyncio.Event()
    queue = asyncio.Queue()
    await queue.put(stream.MarketDescriptor("btc-active", ["1"], None))
    real_wait_for = asyncio.wait_for
    logged_errors = []

    async def fake_stream_single_market(*args, **kwargs):
        raise RuntimeError("task failed")

    async def fake_wait_for(awaitable, timeout):
        capped_timeout = 0.01 if timeout == 1.0 else timeout
        return await real_wait_for(awaitable, timeout=capped_timeout)

    def fake_logger_error(*args):
        logged_errors.append(args)
        stop_event.set()

    monkeypatch.setattr(stream, "stream_single_market", fake_stream_single_market)
    monkeypatch.setattr(stream.asyncio, "wait_for", fake_wait_for)
    monkeypatch.setattr(stream.logger, "error", fake_logger_error)

    await real_wait_for(
        stream.stream_markets_for_asset(
            "btc",
            queue,
            stop_event,
            publisher=object(),
            inactivity_timeout=4.0,
        ),
        timeout=1.0,
    )

    assert logged_errors[0][0] == "Market stream task error (%s): %s"


@pytest.mark.asyncio
async def test_stream_live_feed_enriches_payloads(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=2)
    websocket = FakeWebSocket(
        [
            json.dumps({"price": 88}),
            json.dumps(["raw", "feed"]),
            "not-json",
        ]
    )

    monkeypatch.setattr(
        stream.websockets,
        "connect",
        lambda *args, **kwargs: FakeConnection(websocket),
    )

    subscription = {"action": "subscribe", "topic": "prices"}

    await stream.stream_live_feed(
        "binance",
        subscription,
        "binance.crypto.prices",
        publisher,
        stop_event,
        ping_interval=999.0,
    )

    assert json.loads(websocket.sent_messages[0]) == subscription
    assert publisher.published[0] == (
        "binance.crypto.prices",
        {"price": 88, "meta": {"source": "binance"}},
    )
    assert publisher.published[1] == (
        "binance.crypto.prices",
        {
            "raw_payload": ["raw", "feed"],
            "meta": {"source": "binance", "note": "wrapped_non_dict_payload"},
        },
    )


@pytest.mark.asyncio
async def test_stream_live_feed_handles_timeouts_and_sends_ping(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=1)
    websocket = FakeWebSocket([asyncio.TimeoutError(), json.dumps({"price": 88})])
    start = dt.datetime(2026, 1, 1, 12, 0, 0)

    monkeypatch.setattr(
        stream.websockets,
        "connect",
        lambda *args, **kwargs: FakeConnection(websocket),
    )
    monkeypatch.setattr(
        stream.dt,
        "datetime",
        make_fake_datetime(
            start,
            start + dt.timedelta(seconds=11),
            start + dt.timedelta(seconds=12),
        ),
    )

    await stream.stream_live_feed(
        "binance",
        {"action": "subscribe", "topic": "prices"},
        "binance.crypto.prices",
        publisher,
        stop_event,
        ping_interval=5.0,
    )

    assert websocket.ping_count == 1


@pytest.mark.asyncio
async def test_stream_live_feed_skips_non_json_messages(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=1)
    websocket = FakeWebSocket(["not-json", json.dumps({"price": 12})])

    monkeypatch.setattr(
        stream.websockets,
        "connect",
        lambda *args, **kwargs: FakeConnection(websocket),
    )

    await stream.stream_live_feed(
        "binance",
        {"action": "subscribe", "topic": "prices"},
        "binance.crypto.prices",
        publisher,
        stop_event,
        ping_interval=999.0,
    )

    assert publisher.published[0][1]["meta"]["source"] == "binance"


@pytest.mark.asyncio
async def test_stream_live_feed_retries_after_connection_closed(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event, stop_after=1)
    websocket = FakeWebSocket([json.dumps({"price": 55})])
    sleep_calls = []
    real_sleep = asyncio.sleep
    attempt_count = {"value": 0}

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)
        await real_sleep(0)

    def fake_connect(*args, **kwargs):
        attempt_count["value"] += 1
        if attempt_count["value"] == 1:
            raise RuntimeError("closed")
        return FakeConnection(websocket)

    monkeypatch.setattr(stream.websockets, "ConnectionClosed", RuntimeError)
    monkeypatch.setattr(stream.websockets, "connect", fake_connect)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.stream_live_feed(
        "binance",
        {"action": "subscribe", "topic": "prices"},
        "binance.crypto.prices",
        publisher,
        stop_event,
        ping_interval=999.0,
    )

    assert sleep_calls == [2]


@pytest.mark.asyncio
async def test_stream_live_feed_handles_generic_errors(monkeypatch):
    stop_event = asyncio.Event()
    publisher = RecordingPublisher(stop_event)
    sleep_calls = []

    async def fake_sleep(seconds):
        sleep_calls.append(seconds)
        stop_event.set()

    def fake_connect(*args, **kwargs):
        raise ValueError("boom")

    monkeypatch.setattr(stream.websockets, "connect", fake_connect)
    monkeypatch.setattr(stream.asyncio, "sleep", fake_sleep)

    await stream.stream_live_feed(
        "binance",
        {"action": "subscribe", "topic": "prices"},
        "binance.crypto.prices",
        publisher,
        stop_event,
        ping_interval=999.0,
    )

    assert sleep_calls == [5]


@pytest.mark.asyncio
async def test_run_gateway_starts_and_stops_all_tasks(monkeypatch):
    publisher = MagicMock()
    publisher.close = AsyncMock()
    added_signals = []
    live_calls = []
    populate_calls = []
    market_calls = []

    class FakeLoop:
        def add_signal_handler(self, sig, handler):
            del handler
            added_signals.append(sig)

    async def fake_stream_live_feed(name, payload, channel, publisher_arg, stop_event, ping_interval=10.0):
        del payload, ping_interval
        live_calls.append((name, channel, publisher_arg))
        stop_event.set()

    async def fake_populate_market_queue(asset, config, queue, stop_event, refresh_interval=60.0, min_queue_size=3):
        del queue, stop_event, refresh_interval, min_queue_size
        populate_calls.append((asset, config))

    async def fake_stream_markets_for_asset(asset, queue, stop_event, publisher_arg, inactivity_timeout=10.0):
        del queue, stop_event, inactivity_timeout
        market_calls.append((asset, publisher_arg))

    monkeypatch.setattr(stream, "RedisPublisher", lambda url: publisher)
    monkeypatch.setattr(stream.asyncio, "get_running_loop", lambda: FakeLoop())
    monkeypatch.setattr(stream, "stream_live_feed", fake_stream_live_feed)
    monkeypatch.setattr(stream, "populate_market_queue", fake_populate_market_queue)
    monkeypatch.setattr(stream, "stream_markets_for_asset", fake_stream_markets_for_asset)

    await stream.run_gateway()

    assert publisher.close.await_count == 1
    assert added_signals == [signal.SIGTERM, signal.SIGINT]
    assert {name for name, _, _ in live_calls} == {"chainlink", "binance"}
    assert [asset for asset, _ in populate_calls] == ["btc"]
    assert [asset for asset, _ in market_calls] == ["btc"]


@pytest.mark.asyncio
async def test_run_gateway_handles_cancelled_tasks_and_signal_fallback(monkeypatch):
    publisher = MagicMock()
    publisher.close = AsyncMock()
    fallback_signals = []

    class FakeLoop:
        def add_signal_handler(self, sig, handler):
            del sig, handler
            raise NotImplementedError

    async def cancelled_stream_live_feed(*args, **kwargs):
        raise asyncio.CancelledError

    async def fake_populate_market_queue(*args, **kwargs):
        await asyncio.sleep(0)

    async def fake_stream_markets_for_asset(*args, **kwargs):
        await asyncio.sleep(0)

    monkeypatch.setattr(stream, "RedisPublisher", lambda url: publisher)
    monkeypatch.setattr(stream.asyncio, "get_running_loop", lambda: FakeLoop())
    monkeypatch.setattr(stream.signal, "signal", lambda sig, handler: fallback_signals.append(sig))
    monkeypatch.setattr(stream, "stream_live_feed", cancelled_stream_live_feed)
    monkeypatch.setattr(stream, "populate_market_queue", fake_populate_market_queue)
    monkeypatch.setattr(stream, "stream_markets_for_asset", fake_stream_markets_for_asset)

    await stream.run_gateway()

    assert fallback_signals == [signal.SIGTERM, signal.SIGINT]
    assert publisher.close.await_count == 1


def test_main_runs_gateway(monkeypatch):
    recorded = {}

    def fake_run(coro):
        recorded["code_name"] = coro.cr_code.co_name
        coro.close()

    monkeypatch.setattr(stream.asyncio, "run", fake_run)

    stream.main()

    assert recorded["code_name"] == "run_gateway"
