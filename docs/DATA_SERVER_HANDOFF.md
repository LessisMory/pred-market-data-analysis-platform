# Data Server Handoff

This document summarizes the current frontend/backend state of `pred_market_data_platform` and shows where a data server engineer should plug in live market/chart APIs.

## Product Scope

The app is now a BTC-focused prediction-market analytics product.

Current scope:
- user auth and account management
- admin monitoring
- billing/membership pages
- wallet/history/profile pages
- BTC-focused chart/market-monitoring screens

Removed from scope:
- report generation/download
- real backend order execution / trade placement

## Architecture Summary

Frontend:
- Static HTML + React via CDN
- Served by the backend from `src/fullstack/front_end`
- Uses `fetch(...)` directly from browser JS
- Stores JWT in `localStorage` as `jwt_token`

Backend:
- Node/Express app in `src/fullstack/back_end`
- Serves frontend and API from the same origin
- Auth routes under `/v1/auth/...`
- App data routes mostly under `/v1/...`
- Upstream analytics proxy routes under `/api/analytics/...`
- Existing websocket server mounted at `/stream`

Key backend files:
- [app.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/app.js)
- [routes/analytics.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/routes/analytics.js)
- [controllers/analyticsController.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/controllers/analyticsController.js)
- [services/analyticsService.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/services/analyticsService.js)
- [ws/stream.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/ws/stream.js)
- [config/upstream.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/config/upstream.js)

## What Is Already API-Backed

These areas are already connected to backend routes and Postgres-backed logic:

- Auth:
  - `/v1/auth/register`
  - `/v1/auth/login`
  - `/v1/auth/session`
  - `/v1/auth/me`
  - `/v1/auth/logout`

- User/profile:
  - `/v1/user/me`
  - `/v1/user/profile`
  - `/v1/user/activities`
  - `/v1/user/update`
  - `/v1/user/email`
  - `/v1/user/password`
  - `/v1/user/preferences`
  - `/v1/user/api-keys`
  - `/v1/user/deactivate`

- Wallet/history/billing:
  - `/v1/wallet/overview`
  - `/v1/wallet/history`
  - `/v1/transactions`
  - `/v1/billing/subscribe`

- Admin:
  - `/v1/admin/users`
  - `/v1/admin/transactions`
  - `/v1/admin/platform`
  - user status / role / create / delete / reset-password routes

- Upstream analytics proxy:
  - `/api/analytics/prices/chainlink`
  - `/api/analytics/prices/binance`
  - `/api/analytics/markets`
  - `/api/analytics/trades`
  - `/api/analytics/events`
  - `/api/analytics/series`
  - `/api/analytics/data`

## What Still Uses Mock/Simulated Frontend Data

These are the main remaining gaps for the data server engineer.

### 1. `menu.html`

File:
- [menu.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/front_end/menu.js)

Current behavior:
- user identity comes from `/v1/user/me`
- BTC/polymarket pulse tiles are still generated with `setInterval` and `Math.random`

Current frontend state shape:

```js
{
  btcPrice: 67420.50,
  btcChange: "+2.14%",
  upProb: 0.620,
  dnProb: 0.380,
  upVol: "$1.2M",
  dnVol: "$840K"
}
```

Recommended source:
- websocket `/stream` channel for live ticks, or
- new backend aggregate endpoint if polling is preferred

Recommended payload shape:

```json
{
  "btcPrice": 67423.16,
  "btcChange": "+1.82%",
  "upProb": 0.62,
  "dnProb": 0.38,
  "upVol": "$1.2M",
  "dnVol": "$840K",
  "timestamp": "2026-04-12T12:00:00.000Z"
}
```

### 2. `terminal.html`

File:
- [terminal.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/front_end/terminal.js)

Current behavior:
- terminal is BTC-focused and analytics-heavy
- active contracts are hardcoded BTC contracts
- ETH/SOL are now shown only as `COMING SOON`
- price ticker is simulated
- order book is simulated
- chart series is simulated
- the terminal is charting-only and does not call a backend execution API

Current UI expectations:

- active contracts:
  - `BTC-15M-UP`
  - `BTC-15M-DN`

- price:

```json
{
  "contract": "BTC-15M-UP",
  "price": 67423.16,
  "change24h": "+1.82%"
}
```

- order book:

```json
{
  "asks": [
    { "price": 67423.7, "size": 1.268, "total": 12.5, "depthPct": 35 }
  ],
  "bids": [
    { "price": 67422.7, "size": 1.572, "total": 5.8, "depthPct": 42 }
  ]
}
```

- chart series:

```json
{
  "contract": "BTC-15M-UP",
  "points": [64.1, 65.2, 63.8, 66.4, 67.0],
  "timeframe": "1D",
  "startDate": null,
  "endDate": null,
  "timestamp": "2026-04-12T12:00:00.000Z"
}
```

Recommended integration:
- backend websocket `/stream`
- or new REST endpoints for:
  - current price
  - order book snapshot
  - historical series

Do not assume there is a live backend order route.
If a future release needs real execution, that should be designed separately from this data-server integration.

### 3. `wallet.html`

File:
- [wallet.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/front_end/wallet.js)

Current behavior:
- calls real backend endpoints:
  - `/v1/wallet/overview`
  - `/v1/wallet/history?market=...`
- but still derives chart series in the frontend
- falls back to mock data if the fetch fails
- still simulates updates every 5 seconds after initial load

Current backend response expectations:

`GET /v1/wallet/overview`

```json
{
  "total_trades": 10,
  "total_volume": 1500,
  "total_deposited": 500,
  "pnl": 120,
  "last_active": "2026-04-12T12:00:00.000Z"
}
```

`GET /v1/wallet/history?market=BTC%2015m%20UP`

```json
[
  {
    "event_id": 1,
    "event_type": "order",
    "amount": 100,
    "status": "completed",
    "description": "...",
    "created_at": "2026-04-12T12:00:00.000Z"
  }
]
```

Recommended improvement:
- move from derived/fake chart lines to real time-series arrays returned by backend
- remove the frontend mock fallback once the data server is stable

## Existing Upstream/Data-Service Extension Points

These are already designed to proxy an external data server:

- [config/upstream.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/config/upstream.js)
- [services/analyticsService.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/services/analyticsService.js)
- [controllers/analyticsController.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/controllers/analyticsController.js)

Current env vars:

```env
DATA_SERVICE_API_BASE_URL=http://...
DATA_SERVICE_CHAINLINK_PATH=/chainlink/prices
DATA_SERVICE_BINANCE_PATH=/prices/binance
DATA_SERVICE_MARKETS_PATH=/markets
DATA_SERVICE_DATA_PATH=/data
GAMMA_API_BASE_URL=https://gamma-api.polymarket.com
```

Existing proxy endpoints:

- `GET /api/analytics/prices/chainlink`
- `GET /api/analytics/prices/binance`
- `GET /api/analytics/markets`
- `GET /api/analytics/trades`
- `GET /api/analytics/events`
- `GET /api/analytics/series`
- `GET /api/analytics/data`

These are protected by JWT because `app.js` mounts `/api/analytics` behind `authenticate`.

## Existing WebSocket Layer

File:
- [ws/stream.js](/Users/yinglunsong/Documents/Duke/FINTECH%20512/project/pred_market_data_platform/src/fullstack/back_end/ws/stream.js)

Current state:
- websocket server exists at `/stream`
- channels:
  - `prices`
  - `depth`
  - `trades`
- current relay is still a polling bridge / partial simulation layer
- comments explicitly say to replace it with a real upstream websocket proxy

Current subscribe message:

```json
{ "action": "subscribe", "channel": "prices", "symbol": "BTC/USD" }
```

Suggested engineer action:
- keep `/stream` stable if possible
- replace `startUpstreamRelay()` implementation with real upstream subscriptions
- normalize outbound payloads to the frontend state shapes above

## Recommended Integration Priority

### Priority 1

Replace simulated market data in:
- `menu.js`
- `terminal.js`

Best approach:
- keep backend as the single integration point
- connect frontend to backend websocket `/stream`
- have backend map data-server payloads into frontend-ready shapes

### Priority 2

Improve wallet data realism:
- replace derived frontend series with real timeseries from backend
- remove frontend fallback mock mode once stable

### Priority 3

Decide whether to use:
- existing `/api/analytics/...` proxy routes
- or add new `/v1/market-pulse`, `/v1/terminal/book`, `/v1/terminal/series` routes for frontend-specific payloads

Recommendation:
- keep `/api/analytics/...` as raw-ish proxy/debug endpoints
- add frontend-facing normalized endpoints or websocket payloads for UI consumption

## Frontend Contracts To Preserve

The engineer should preserve these UX assumptions:

- app is same-origin: frontend calls backend directly without separate frontend host config
- JWT auth header is:

```http
Authorization: Bearer <jwt_token>
```

- only BTC contracts are active right now
- ETH/SOL remain hidden behind `COMING SOON`
- reports are intentionally removed
- real backend order execution is intentionally removed

## Important Non-Goals

Do not reintroduce:
- order placement/execution APIs
- report generation/download APIs
- ETH/SOL active contract trading/monitoring before product approval

## Short Version For The Data Engineer

If you only need the minimum:

1. Replace mock data in `menu.js` and `terminal.js`
2. Use backend `/stream` or new normalized `/v1/...` endpoints
3. Keep auth/account/admin/billing routes untouched
4. Treat `/api/analytics/...` plus `analyticsService.js` and `upstream.js` as the current backend integration seam
5. Keep the terminal BTC-focused and charting-only unless product scope changes
