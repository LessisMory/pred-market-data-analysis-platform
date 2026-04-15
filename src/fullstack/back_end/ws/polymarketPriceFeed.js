const WebSocket = require('ws');

const POLYMARKET_RTDS_URL =
  process.env.POLYMARKET_RTDS_URL || 'wss://ws-live-data.polymarket.com';
const HEARTBEAT_INTERVAL_MS = 5_000;
const RECONNECT_DELAY_MS = 3_000;
const PRICE_TOPIC = 'crypto_prices_chainlink';
const RAW_BTC_SYMBOL = 'btc/usd';
const DISPLAY_BTC_SYMBOL = 'BTC/USD';

const BTC_PRICE_SUBSCRIPTION = Object.freeze({
  action: 'subscribe',
  subscriptions: [
    {
      topic: PRICE_TOPIC,
      type: '*',
      filters: JSON.stringify({ symbol: RAW_BTC_SYMBOL }),
    },
  ],
});

const toRawString = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('utf8');
  }

  return value === null || value === undefined ? '' : String(value);
};

const normalizeTimestamp = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const numeric = Number(raw);
  const parsed = Number.isFinite(numeric) && /^\d+$/.test(raw)
    ? new Date(numeric)
    : new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizePriceUpdate = (message = {}) => {
  if (message.topic !== PRICE_TOPIC || message.type !== 'update') {
    return null;
  }

  const payload = message.payload || {};
  const symbol = String(payload.symbol || '').trim().toLowerCase();
  if (symbol !== RAW_BTC_SYMBOL) {
    return null;
  }

  const value = Number(payload.value);
  const timestamp = normalizeTimestamp(payload.timestamp ?? message.timestamp);
  if (!Number.isFinite(value) || !timestamp) {
    return null;
  }

  return {
    symbol: DISPLAY_BTC_SYMBOL,
    rawSymbol: RAW_BTC_SYMBOL,
    value,
    timestamp,
    source: 'polymarket_rtds_chainlink',
  };
};

function createPolymarketPriceFeed({
  onPrice = () => {},
  wsFactory = (url) => new WebSocket(url),
  connectUrl = POLYMARKET_RTDS_URL,
} = {}) {
  let socket = null;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let shouldRun = false;

  const clearHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send('PING');
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  const scheduleReconnect = () => {
    clearReconnect();
    if (!shouldRun) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  };

  const handleMessage = (raw) => {
    const text = toRawString(raw).trim();
    if (!text || text === 'PONG') {
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    const update = normalizePriceUpdate(parsed);
    if (update) {
      onPrice(update);
    }
  };

  const connect = () => {
    if (!shouldRun || socket) {
      return;
    }

    const client = wsFactory(connectUrl);
    socket = client;

    client.on('open', () => {
      if (socket !== client) {
        return;
      }

      clearReconnect();
      startHeartbeat();
      client.send(JSON.stringify(BTC_PRICE_SUBSCRIPTION));
    });

    client.on('message', handleMessage);
    client.on('error', () => {
      // Reconnect is handled by the close event.
    });

    client.on('close', () => {
      clearHeartbeat();
      if (socket === client) {
        socket = null;
      }
      scheduleReconnect();
    });
  };

  return {
    start() {
      shouldRun = true;
      clearReconnect();
      connect();
    },

    stop() {
      shouldRun = false;
      clearReconnect();
      clearHeartbeat();

      const activeSocket = socket;
      socket = null;

      if (!activeSocket) {
        return;
      }

      if (
        activeSocket.readyState === WebSocket.OPEN ||
        activeSocket.readyState === WebSocket.CONNECTING
      ) {
        activeSocket.close();
      }
    },
  };
}

module.exports = {
  BTC_PRICE_SUBSCRIPTION,
  DISPLAY_BTC_SYMBOL,
  createPolymarketPriceFeed,
  normalizePriceUpdate,
  normalizeTimestamp,
};
