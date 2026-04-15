jest.mock('ws', () => ({
  OPEN: 1,
  CONNECTING: 0,
}), { virtual: true });

const {
  BTC_PRICE_SUBSCRIPTION,
  createPolymarketPriceFeed,
  normalizePriceUpdate,
} = require('../ws/polymarketPriceFeed');

class MockSocket {
  constructor(url) {
    this.url = url;
    this.handlers = new Map();
    this.sent = [];
    this.readyState = 0;
    this.close = jest.fn(() => {
      this.readyState = 3;
    });
  }

  on(eventName, handler) {
    this.handlers.set(eventName, handler);
    return this;
  }

  emit(eventName, payload) {
    const handler = this.handlers.get(eventName);
    if (handler) {
      handler(payload);
    }
  }

  send(payload) {
    this.sent.push(payload);
  }
}

describe('normalizePriceUpdate', () => {
  test('normalizes a BTC/USD Chainlink RTDS update', () => {
    expect(normalizePriceUpdate({
      topic: 'crypto_prices_chainlink',
      type: 'update',
      timestamp: 1753314088421,
      payload: {
        symbol: 'btc/usd',
        timestamp: 1753314088395,
        value: 67234.5,
      },
    })).toEqual({
      symbol: 'BTC/USD',
      rawSymbol: 'btc/usd',
      value: 67234.5,
      timestamp: '2025-07-23T23:41:28.395Z',
      source: 'polymarket_rtds_chainlink',
    });
  });

  test('ignores updates for other symbols or invalid payloads', () => {
    expect(normalizePriceUpdate({
      topic: 'crypto_prices_chainlink',
      type: 'update',
      payload: {
        symbol: 'eth/usd',
        timestamp: 1753314088395,
        value: 3456.78,
      },
    })).toBeNull();

    expect(normalizePriceUpdate({
      topic: 'crypto_prices_chainlink',
      type: 'update',
      payload: {
        symbol: 'btc/usd',
        timestamp: 'bad-timestamp',
        value: 'not-a-number',
      },
    })).toBeNull();
  });
});

describe('createPolymarketPriceFeed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('subscribes on open, forwards price updates, and sends heartbeats', () => {
    let socket = null;
    const wsFactory = jest.fn((url) => {
      socket = new MockSocket(url);
      return socket;
    });
    const onPrice = jest.fn();

    const feed = createPolymarketPriceFeed({
      onPrice,
      wsFactory,
      connectUrl: 'wss://example.test/rtds',
    });

    feed.start();

    expect(wsFactory).toHaveBeenCalledWith('wss://example.test/rtds');

    socket.readyState = 1;
    socket.emit('open');

    expect(socket.sent[0]).toBe(JSON.stringify(BTC_PRICE_SUBSCRIPTION));

    socket.emit('message', JSON.stringify({
      topic: 'crypto_prices_chainlink',
      type: 'update',
      timestamp: 1753314088421,
      payload: {
        symbol: 'btc/usd',
        timestamp: 1753314088395,
        value: 67234.5,
      },
    }));

    expect(onPrice).toHaveBeenCalledWith({
      symbol: 'BTC/USD',
      rawSymbol: 'btc/usd',
      value: 67234.5,
      timestamp: '2025-07-23T23:41:28.395Z',
      source: 'polymarket_rtds_chainlink',
    });

    jest.advanceTimersByTime(5000);
    expect(socket.sent[1]).toBe('PING');

    feed.stop();
    expect(socket.close).toHaveBeenCalled();
  });
});
