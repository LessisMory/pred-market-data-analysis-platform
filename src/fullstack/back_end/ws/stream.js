const WebSocket = require('ws');
const { gamma, dataService } = require('../config/upstream');

/**
 * WebSocket stream endpoint — wss://.../stream
 *
 * Pushes real-time prices, order-book depth, and chart tick data to
 * connected clients. Clients send JSON subscription messages:
 *
 *   { "action": "subscribe",   "channel": "prices", "symbol": "BTC/USD" }
 *   { "action": "subscribe",   "channel": "depth",  "market": "<slug>"  }
 *   { "action": "unsubscribe", "channel": "prices" }
 *
 * The server proxies upstream WebSocket feeds and fans data out to
 * each subscriber on the matching channel.
 */

const HEARTBEAT_INTERVAL = 30_000; // 30 s

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/stream' });

  // Track subscriptions per client
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.subscriptions = new Set();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        ws.send(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const { action, channel } = msg;

      if (action === 'subscribe' && channel) {
        ws.subscriptions.add(channel);
        ws.send(JSON.stringify({ status: 'subscribed', channel }));
      } else if (action === 'unsubscribe' && channel) {
        ws.subscriptions.delete(channel);
        ws.send(JSON.stringify({ status: 'unsubscribed', channel }));
      } else {
        ws.send(JSON.stringify({ error: 'Unknown action. Use subscribe/unsubscribe.' }));
      }
    });

    ws.on('close', () => {
      ws.subscriptions.clear();
    });

    // Welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'OBAnalyzer stream ready',
      channels: ['prices', 'depth', 'trades'],
    }));
  });

  // Heartbeat — disconnect stale clients
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => clearInterval(heartbeat));

  // Simulated upstream feed — replace with real upstream WS proxy
  startUpstreamRelay(wss);

  return wss;
}

/**
 * Polls upstream REST endpoints on a short interval and pushes
 * updates to subscribed clients.  Replace with a true upstream
 * WebSocket connection when available.
 */
function startUpstreamRelay(wss) {
  const POLL_INTERVAL = 1_000; // 1 s for price ticks, 5 s for depth

  // --- Price ticker (1 s) ---
  const priceTimer = setInterval(async () => {
    if (countSubscribers(wss, 'prices') === 0) return;

    try {
      const res = await fetch(
        `${dataService.baseUrl}${dataService.paths.binancePrices}?limit=1`
      );
      if (!res.ok) return;
      const data = await res.json();

      broadcast(wss, 'prices', {
        type: 'prices',
        timestamp: new Date().toISOString(),
        data,
      });
    } catch {
      // upstream unavailable — skip this tick
    }
  }, POLL_INTERVAL);

  // --- Depth snapshots (5 s) ---
  const depthTimer = setInterval(async () => {
    if (countSubscribers(wss, 'depth') === 0) return;

    try {
      const res = await fetch(
        `${dataService.baseUrl}${dataService.paths.data}?startTime=${new Date(Date.now() - 5000).toISOString()}&endTime=${new Date().toISOString()}`
      );
      if (!res.ok) return;
      const data = await res.json();

      broadcast(wss, 'depth', {
        type: 'depth',
        timestamp: new Date().toISOString(),
        data,
      });
    } catch {
      // upstream unavailable — skip this tick
    }
  }, 5_000);

  // --- Trades feed (1 s) ---
  const tradesTimer = setInterval(async () => {
    if (countSubscribers(wss, 'trades') === 0) return;

    try {
      const res = await fetch(
        `${gamma.baseUrl}${gamma.paths.trades}?limit=10`
      );
      if (!res.ok) return;
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw : raw.data || raw.rows || raw;

      broadcast(wss, 'trades', {
        type: 'trades',
        timestamp: new Date().toISOString(),
        data,
      });
    } catch {
      // upstream unavailable — skip this tick
    }
  }, POLL_INTERVAL);

  // Clean up on server close
  wss.on('close', () => {
    clearInterval(priceTimer);
    clearInterval(depthTimer);
    clearInterval(tradesTimer);
  });
}

function countSubscribers(wss, channel) {
  let count = 0;
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws.subscriptions.has(channel)) {
      count++;
    }
  });
  return count;
}

function broadcast(wss, channel, payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws.subscriptions.has(channel)) {
      ws.send(msg);
    }
  });
}

module.exports = { initWebSocket };
