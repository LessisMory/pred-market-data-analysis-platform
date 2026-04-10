# OBAnalyzer — Security Logging Design

**Reference:** OWASP Logging Cheat Sheet · OWASP C9: Implement Security Logging and Monitoring  
**Scope:** Frontend (browser client) + Backend Express API  
**Last updated:** 2026-04-10

---

## 1. Where to Record Event Data

| OWASP Guideline | Decision | Rationale |
|---|---|---|
| Application code is the primary event data source | Implemented | All log events are emitted from application code (frontend JS + backend Express middleware), not inferred from infrastructure logs alone |
| Use a separate partition/database account for log storage | Implemented (backend) | Backend writes logs to a dedicated `ob_audit_logs` table using a restricted DB user with INSERT-only permissions on that table |
| Do not expose logs in web-accessible locations | Implemented | Log endpoints are admin-only (`/api/analytics/admin/*`), protected by `authenticate` + role check middleware. No log files are served as static assets |
| Use standard formats over secure protocols when sending logs to other systems | Implemented | All log entries use structured JSON (see Section 3). In-transit log shipping uses HTTPS only |
| File-based logs: apply strict directory/file permissions | Not applicable | This project uses a database-backed log store, not flat files. If file logging is added in future, permissions will be enforced |
| Store/copy log data to read-only media as soon as possible | Deferred | Outside scope of current sprint. Planned: replicate `ob_audit_logs` to an append-only S3 bucket in a future sprint |
| All access to logs must be recorded and monitored | Implemented | Admin reads of the log table are themselves logged as `admin_log_access` events |
| Restrict log read privileges; review periodically | Implemented | Only users with `role = 'admin'` can query log data. Privilege review cadence: monthly |

---

## 2. Which Events to Log

### Always log

| Event category | Specific event | Implemented in |
|---|---|---|
| Input validation failure | Malformed JWT / missing auth header | `authenticate.js` middleware |
| Authentication success | User login via `/v1/auth/verify-mfa` | `authController.js` |
| Authentication failure | Wrong password, wrong MFA code | `authController.js` |
| Authorisation failure | Non-admin user attempts admin endpoint | `requireSubscription.js` + role check |
| Session management | Token issued, token revoked on sign-out | `authController.js` |
| Subscription / billing events | Plan upgrade, payment processed, payment failed | `billingController.js` (planned) |
| Data export | CSV/PDF report generated and downloaded | `analyticsController.js` |
| Admin actions | Account disabled, password reset triggered | `analyticsController.js` admin routes |
| Application errors | Unhandled exceptions, 5xx responses | Global error handler in `app.js` |

### Optionally log (implemented)

| Event category | Decision |
|---|---|
| Successful read of sensitive data (wallet overview, transaction history) | Logged at DEBUG level — useful for anomaly detection |
| Order execution | Logged — financial action with non-repudiation value |
| Market/contract switch on terminal | Not logged — no security or business value; would add noise |

### Explicitly not logged

| Event | Reason not logged |
|---|---|
| Static asset requests (HTML, CSS, JS files) | Infrastructure-level concern; no security value at application level |
| Chart data polling / WebSocket tick updates | High-frequency, no auth risk, would fill logs with noise |
| UI toggle state (Area on/off, chart tab switch) | Pure UI state, no security or business relevance |
| Passwords, raw MFA codes, card numbers | OWASP explicitly prohibits logging credentials and payment data |

---

## 3. Event Attributes (Log Entry Format)

All log entries are written as **JSON objects**, one per line (NDJSON), consistent with OWASP's recommendation to use a standard, machine-readable format.

### Schema

```json
{
  "datetime":    "2026-04-10T14:32:01.456Z",
  "appid":       "obanalyzer.api",
  "level":       "INFO",
  "event":       "authn_login_success",
  "userId":      "U-001",
  "userRole":    "user",
  "sessionId":   "sess_abc123",
  "sourceIp":    "192.168.1.1",
  "endpoint":    "POST /v1/auth/verify-mfa",
  "outcome":     "success",
  "description": "User U-001 authenticated successfully via MFA",
  "requestId":   "req_xyz789"
}
```

### Attribute mapping to OWASP Event Attributes

| OWASP attribute | Field in our schema | Notes |
|---|---|---|
| When (timestamp) | `datetime` | ISO 8601 UTC. Server time only — not client time |
| Where (application identifier) | `appid` | Fixed value `obanalyzer.api` |
| Where (geolocation / source IP) | `sourceIp` | Extracted from `req.ip` after proxy trust configuration |
| Who (user identity) | `userId` | Internal user ID (not email — avoids PII in logs) |
| Who (user role/permissions) | `userRole` | `user` or `admin` |
| Who (session) | `sessionId` | Hashed session identifier |
| What (event type) | `event` | Snake_case verb — follows OWASP Logging Vocabulary where applicable |
| What (endpoint) | `endpoint` | HTTP method + path |
| What (outcome) | `outcome` | `success`, `failure`, `error` |
| Severity / level | `level` | `DEBUG`, `INFO`, `WARN`, `ERROR`, `CRITICAL` |
| Human description | `description` | Free text, sanitised before write |
| Trace correlation | `requestId` | UUID generated per request in middleware |

### Data excluded per OWASP guidance

- Passwords, raw MFA codes
- Full credit card numbers or bank account numbers
- Session tokens or JWT values in cleartext
- Application source code
- Personal data beyond what is operationally necessary (email is not logged; userId is used instead)

---

## 4. Log Sanitisation and Security Controls

| Control | Implementation |
|---|---|
| Sanitise CR/LF and delimiter characters to prevent log injection | All string fields passed through `sanitizeLogField()` helper (strips `\r`, `\n`, `\t`, `|`, `;`) before write |
| Encode data correctly for output format | JSON serialisation handles escaping; no string concatenation into log lines |
| Failures in logging must not crash the application | Log writes are wrapped in try/catch; failure is silently swallowed and flagged to a separate error counter |
| Synchronise time across servers | NTP enforced at infrastructure level (AWS default); all timestamps are server-side UTC |
| Tamper detection | `ob_audit_logs` table is append-only; DELETE and UPDATE privileges revoked from the log DB user |
| Retention policy | Logs retained for 90 days, then archived to S3. Hard delete after 1 year |
| PII handling | Email addresses are not written to logs; userId (opaque internal ID) is used instead |

---

## 5. Frontend Logging (Client-Side)

The browser client sends security-relevant events to the backend log ingestion endpoint:

**Endpoint:** `POST /api/analytics/logs/client`  
**Auth required:** Yes (Bearer JWT)

Events sent from the frontend:

| Event | Trigger |
|---|---|
| `authn_login_attempt` | User clicks Sign In |
| `authn_mfa_attempt` | User submits MFA code |
| `authn_logout` | User clicks Sign Out |
| `authz_admin_access` | Admin panel loaded (role = admin) |
| `authz_redirect` | Non-admin redirected away from admin page |
| `order_execute_attempt` | User clicks Place Order |
| `report_generate_request` | User clicks Download Report |
| `subscription_upgrade_attempt` | User clicks Subscribe |
| `client_error` | Unhandled JS error caught by `window.onerror` |

**Note:** Client-supplied timestamps are not trusted for security purposes. The backend stamps all log entries with server-side UTC time on receipt.

---

## 6. Monitoring and Alerting (Planned)

The following alert thresholds are defined for implementation in the next sprint:

| Condition | Alert level | Action |
|---|---|---|
| 5+ failed logins for same userId in 10 min | WARN | Lock account, notify admin |
| Admin endpoint accessed from new IP | WARN | Email notification to admin |
| VPIN > 0.70 sustained for > 5 min | INFO | Platform health dashboard flag |
| 3+ failed order executions in 1 min | WARN | Flag for manual review |
| `client_error` rate > 10/min | ERROR | PagerDuty alert |