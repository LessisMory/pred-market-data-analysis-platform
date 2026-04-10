# OBAnalyzer — Frontend Prototype

Institutional-grade data ingestion and trading terminal for Prediction Markets (Polymarket) and Crypto (BTC/USD).

---

## 1. Tech Stack & Setup

| | |
| :--- | :--- |
| **Framework** | React 18 (CDN), Babel Standalone |
| **Styling** | Inline CSS, custom design system via `shared.js` (`window.C`) |
| **Fonts** | JetBrains Mono, DM Sans (Google Fonts) |
| **Auth** | JWT stored in `localStorage`, role-based routing |
| **Run locally** | `python -m http.server` or VS Code Live Server → open `index.html` |

No `npm install` required for the demo.

---

## 2. Page Modules

### Auth & Onboarding
| File | Description |
| :--- | :--- |
| `index.html` | Landing page + sign-in gateway. Email/password → 2FA SMS flow. On success, stores `jwt_token`, `ob_user_name`, `ob_user_role` and routes to `menu.html` or `admin.html` based on role. |
| `login.html` | Standalone sign-in page (same auth logic as index). |
| `register.html` | Institutional account creation. Dynamic password strength meter, phone binding, SMS token verification. |

### Core Terminal
| File | Description |
| :--- | :--- |
| `menu.html` | Main dashboard hub. Market pulse overview (live BTC/USD, Polymarket UP/DN probabilities). Routes to all modules. Admin Panel card visible only when `ob_user_role === 'admin'`. |
| `terminal.html` | Live trading terminal. BTC/USD price feed, L2 order book depth, candlestick chart with custom timeframe + datetime range selector, order execution panel. |
| `wallet.html` | Performance analytics. Real-time P&L, Win Rate, Avg Profit, Capital Efficiency — streaming chart with 5s settlement simulation. |

### User Management
| File | Description |
| :--- | :--- |
| `history.html` | Transaction ledger. Filterable billing grid (All / Paid / Refunded) with live WebSocket push simulation. |
| `reports.html` | Report generation. Template picker, market/date/format selectors, scheduled reports sidebar. |
| `membership.html` | Subscription tiers (Free / Pro / Elite). Monthly/annual toggle with 20% annual discount. |
| `profile.html` | Account settings. Stats cards, edit profile form, recent activity timeline. |

### Admin
| File | Description |
| :--- | :--- |
| `admin.html` | Admin-only panel. Route-guarded — non-admin users are redirected to `menu.html` on load. Five tabs: All Users (searchable directory), Disable Accounts (toggle active/disabled), Reset Passwords (send reset link), System Transactions (event log + daily KPIs), Platform Analysis (MRR, churn, plan distribution, top traders, DAU). |

---

## 3. Shared Design System (`shared.js`)

All pages import global tokens and components from `window`:

```js
window.C        // color palette
window.Logo     // brand logo component
window.Tag      // status/label badge
window.Input    // styled input with icon + focus state
window.Btn      // primary / ghost button with disabled state
```

---

## 4. Auth Flow & Role Routing

```
POST /v1/auth/login  →  credentials OK  →  POST /v1/auth/verify-mfa
                                                      ↓
                                          JWT + { firstName, role }
                                                      ↓
                                  role === 'admin'  →  admin.html
                                  role === 'user'   →  menu.html
```

Keys persisted to `localStorage`:

| Key | Value |
| :--- | :--- |
| `jwt_token` | Bearer token, sent in `Authorization` header on all protected requests |
| `ob_user_name` | Display name, read by all pages |
| `ob_user_role` | `'admin'` or `'user'`, controls menu card visibility and admin route guard |

All three keys are cleared on Sign Out.

---

## 5. Backend API Reference

### Route Prefix Summary
| Prefix | Auth Required | Description |
| :--- | :--- | :--- |
| `/v1/auth/...` | No | Public auth endpoints |
| `/api/analytics/...` | Yes — JWT | All protected data endpoints |

---

### Authentication  `/v1/auth/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/auth/login` | Verify email + password, trigger 2FA if valid. |
| `POST` | `/v1/auth/register` | Create user record, hash password in DB. |
| `POST` | `/v1/auth/send-sms` | Dispatch 6-digit code via AWS SNS / Twilio. |
| `POST` | `/v1/auth/verify-mfa` | Validate SMS code → return `{ token, user: { firstName, role } }`. |

### User  `/api/analytics/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/user/me` | Return `{ firstName, planName, role }` for nav + menu. |
| `GET` | `/api/analytics/user/profile` | Profile stats: snapshots viewed, replays run, days active, tickers. |
| `GET` | `/api/analytics/user/activities` | Recent activity timeline array. |
| `PUT` | `/api/analytics/user/update` | Update first/last name. |

### Market & Terminal  `/api/analytics/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/markets/active` | List of active Polymarket contracts. |
| `WS`  | `wss://.../stream/market-pulse` | **[CRITICAL]** Live BTC price, Polymarket UP/DN probabilities. |
| `WS`  | `wss://.../stream/orderbook` | **[CRITICAL]** L2 order book depth updates. |
| `POST` | `/api/analytics/orders` | Route trade payload `{ market, size, type }` to execution engine. |

### Wallet  `/api/analytics/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/wallet/overview` | Aggregate KPIs: total P&L, win rate, avg profit, capital efficiency. |
| `GET` | `/api/analytics/wallet/history?market=<id>` | Time-series arrays `{ pnl: [], win: [], profit: [], eff: [] }`. |

### Billing  `/api/analytics/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analytics/billing/subscribe` | Process payment, upgrade plan tier `{ planId, cycle }`. |
| `GET`  | `/api/analytics/transactions` | User billing ledger. |

### Reports  `/api/analytics/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`  | `/api/analytics/reports/metrics` | Macro stats: total P&L, win rate, volume, reports generated. |
| `GET`  | `/api/analytics/reports/scheduled` | List of active/paused scheduled report jobs. |
| `POST` | `/api/analytics/reports/generate` | Trigger S3 data compilation → return `{ downloadUrl }`. Body: `{ template, format, dateRange, market }`. |

### Admin  `/api/analytics/admin/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`   | `/api/analytics/admin/users` | Full user directory (admin JWT required). |
| `PATCH` | `/api/analytics/admin/users/:id/status` | Toggle account active/disabled. Body: `{ status }`. |
| `POST`  | `/api/analytics/admin/users/:id/reset-password` | Trigger password reset email for target user. |

---

## 6. File Structure

```
/
├── index.html
├── login.html
├── register.html
├── menu.html
├── terminal.html
├── wallet.html
├── history.html
├── reports.html
├── membership.html
├── profile.html
├── admin.html
├── styles.css
└── js/
    ├── shared.js
    ├── index.js
    ├── login.js
    ├── register.js
    ├── menu.js
    ├── terminal.js
    ├── wallet.js
    ├── history.js
    ├── reports.js
    ├── membership.js
    ├── profile.js
    └── admin.js
```
