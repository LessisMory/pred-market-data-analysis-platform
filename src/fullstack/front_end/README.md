# OBAnalyzer — Frontend Prototype

Institutional-grade BTC prediction-market dashboard for analytics, monitoring, and terminal-style exploration.

---

## 1. Tech Stack & Setup

| | |
| :--- | :--- |
| **Framework** | React 18 (CDN), Babel Standalone |
| **Styling** | Inline CSS, custom design system via `shared.js` (`window.C`) |
| **Fonts** | JetBrains Mono, DM Sans (Google Fonts) |
| **Auth** | Backend JWT auth for email/password, optional Google sign-in via Firebase |
| **Run locally** | Start the backend server and open `http://localhost:3000` |

No `npm install` required for the demo.

---

## 2. Page Modules

### Auth & Onboarding
| File | Description |
| :--- | :--- |
| `index.html` | Landing page + sign-in gateway. Email/password signs in against the backend, while Google sign-in is optional via Firebase. On success, stores session data in `localStorage` and routes to `menu.html` or `admin.html` based on role. |
| `login.html` | Standalone sign-in page (same auth logic as index). |
| `register.html` | Institutional account creation. Dynamic password strength meter with backend-backed registration; Google sign-up remains optional. |

### Core Terminal
| File | Description |
| :--- | :--- |
| `menu.html` | Main dashboard hub. Market pulse overview (live BTC/USD, Polymarket UP/DN probabilities). Routes to all modules. Admin Panel card visible only when `ob_user_role === 'admin'`. |
| `terminal.html` | BTC 15-minute prediction-market terminal. Multi-panel price/depth/heatmap analytics with a shared period selector. |
| `wallet.html` | Performance analytics. Real-time P&L, Win Rate, Avg Profit, Capital Efficiency — streaming chart with 5s settlement simulation. |

### User Management
| File | Description |
| :--- | :--- |
| `history.html` | Transaction ledger. Filterable billing grid (All / Paid / Refunded) with live WebSocket push simulation. |
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
POST /v1/auth/login or POST /v1/auth/register
                        ↓
             JWT + { firstName, role }
                        ↓
     role === 'admin'  →  admin.html
     role === 'user'   →  menu.html
```

Optional Google sign-in uses Firebase popup auth, then exchanges the Firebase ID token with:

```
POST /v1/auth/session  →  synced local user/session  →  menu.html or admin.html
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
| `/v1/...` | Usually yes — JWT | Protected app data endpoints |

---

### Authentication  `/v1/auth/`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`  | `/v1/auth/config` | Return client-side Firebase config for optional Google sign-in. |
| `POST` | `/v1/auth/register` | Create user record, hash password in DB, and return JWT. |
| `POST` | `/v1/auth/login` | Verify email/password or special admin credentials and return JWT. |
| `POST` | `/v1/auth/session` | Exchange Firebase Google sign-in token for an app session. |
| `GET`  | `/v1/auth/me` | Return the currently authenticated user. |
| `POST` | `/v1/auth/logout` | Clear the current app session. |

### User  `/v1/user`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/user/me` | Return profile summary for navigation and menu screens. |
| `GET` | `/v1/user/profile` | Profile stats: user details, activity summary, preferences, API keys. |
| `GET` | `/v1/user/activities` | Recent activity timeline array. |
| `PUT` | `/v1/user/update` | Update first/last name and other profile fields. |

### Market & Terminal  `/v1`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/markets/active` | List of active Polymarket contracts. |
| `WS`  | `wss://.../stream/market-pulse` | **[CRITICAL]** Live BTC price, Polymarket UP/DN probabilities. |
| `WS`  | `wss://.../stream/orderbook` | **[CRITICAL]** L2 order book depth updates. |

Terminal note:
- the terminal is charting-only in the current build
- there is no active backend order-execution route in the current build

### Wallet  `/v1/wallet`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/wallet/overview` | Aggregate KPIs: total P&L, trades, deposits, recent activity. |
| `GET` | `/v1/wallet/history?market=<id>` | Historical rows for the wallet chart. |

### Billing  `/v1`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/billing/subscribe` | Process payment, upgrade plan tier `{ planId, cycle }`. |
| `GET`  | `/v1/transactions` | User billing ledger. |

### Admin  `/v1/admin`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`   | `/v1/admin/users` | Full user directory (admin JWT required). |
| `PATCH` | `/v1/admin/users/:id/status` | Toggle account active/disabled. Body: `{ status }`. |
| `POST`  | `/v1/admin/users/:id/reset-password` | Trigger password reset email for target user. |

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
    ├── membership.js
    ├── profile.js
    └── admin.js
```
