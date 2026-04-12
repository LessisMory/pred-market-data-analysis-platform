# Prediction Market Data Platform Logging Design

Reference: OWASP Logging Cheat Sheet, sections "Where to record event data", "Which events to log", and "Event attributes"  
Source: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html  
Project: `pred_market_data_platform`  
Date: 2026-04-11

This document records the logging design we are implementing for this repository. "Implementing" means the item is part of the intended project logging design, using the current project sinks where practical:

- application/runtime logs to service stdout/stderr for the Python data services and the Node backend
- durable audit/event records in PostgreSQL tables such as `system_events`, `admin_actions`, and `user_activity`

Items marked "Not implementing" are intentionally out of scope for the current semester prototype or are not a good fit for this architecture.

## Where to Record Event Data

| OWASP item | Decision | Project-specific note |
| --- | --- | --- |
| Prefer a separate file-system partition for logs when using file-based logging | Not implementing | This project is not using dedicated file-based application logs as its primary sink. Runtime logs go to stdout/stderr, and durable business/audit records go to PostgreSQL. |
| Apply strict directory and file permissions for file-based logs | Not implementing | Same reason as above: we are not designing around flat log files in this repo. |
| Do not expose logs in web-accessible locations | Implementing | Logs are not served as static frontend assets. Durable records stay in database tables, and service logs stay in container/process output. |
| Use a separate database account with restrictive permissions for writing logs | Not implementing | The current prototype uses the main application database connection. Separate insert-only log credentials would be a good hardening step later, but are not part of the current delivery scope. |
| Use standard formats over secure protocols when sending logs to other systems | Not implementing | We are not integrating a SIEM/syslog/CEF pipeline in this project. The deployment is local/Docker-oriented, so stdout logs and PostgreSQL audit tables are sufficient for the current milestone. |
| Consider separate files or tables for extended event information such as stack traces or full HTTP headers/bodies | Not implementing | We intentionally keep logs concise and avoid storing raw request/response bodies or large stack traces because of sensitivity, noise, and storage cost. The current tables only store compact summaries and metadata. |

## Which Events to Log

### Always Log

| OWASP item | Decision | Project-specific note |
| --- | --- | --- |
| Input validation failures | Implementing | We will log validation failures for security-relevant API inputs such as auth, admin, billing, and order endpoints. |
| Failures to validate against a discrete finite list of valid values | Implementing | This is especially relevant for fields such as `plan`, `side`, `status`, and similar enumerated values because these are strong indicators of tampering rather than normal user mistakes. |
| Output validation failures | Not implementing | The current project is mostly passing through query results and generated summaries; it does not have a separate output-validation layer worth logging yet. |
| Authentication successes and failures | Implementing | This includes registration, login, MFA send/verify, phone auth, OAuth session exchange, and logout events in the fullstack backend. |
| Authorization failures | Implementing | This includes `requireAdmin`, `requireSubscription`, and other denied-access paths. |
| Session management failures | Implementing | JWT verification failures, expired tokens, and invalid bearer tokens will be logged because they are security-relevant. |
| Application errors and system events | Implementing | This includes backend exceptions plus operational failures in the Python services such as Redis, Kafka, database, upstream API, and websocket failures. |
| Application and related systems start-up, shut-down, and logging initialization | Implementing | The data services already emit startup/shutdown logs, and the backend should do the same consistently. |
| User administration actions | Implementing | Administrative changes to user state are already a good fit for `admin_actions`, especially status changes and password resets. |
| Use of systems administrative privileges or access by application administrators | Implementing | Admin route access and admin-initiated actions are high-value audit events for this platform. |
| Use of default/shared/"break-glass" accounts | Implementing | The configured direct admin login path is sensitive and should always be audited when used. |
| Access to sensitive data such as payment cardholder data | Not implementing | The platform does not store raw cardholder data. Billing records are summary-level only, so there is no card-data access event to log. |
| Encryption activities such as key use or key rotation | Not implementing | Key management is handled outside this application. The repo does not implement an in-app key-rotation workflow. |
| Creation and deletion of system-level objects | Not implementing | The application does not manage operating-system objects or database admin objects as part of normal product behavior. |
| Data import and export, including screen-based reports | Implementing | Report generation is already a business event worth logging, and data-ingestion services also produce operational logs for upstream collection and transform activity. |
| Submission and processing of user-generated content, especially file uploads | Not implementing | The current product does not support file upload or free-form user content submission. |
| Deserialization failures | Implementing | This applies directly to malformed JSON or non-dict payloads in the transform layer and similar invalid payload cases elsewhere. |
| Network connections and associated failures | Implementing | This includes websocket reconnects, upstream Polymarket/Gamma failures, Redis publish failures, Kafka publish failures, and related backend connectivity issues. |
| Legal and other opt-ins such as terms acceptance or marketing consent | Not implementing | The project currently has no dedicated consent-management feature, so there is no reliable event source for these records yet. |
| Attempts to perform actions out of order or bypass flow control | Implementing | Examples include invalid MFA flow usage, calling protected endpoints without valid auth, or trying to use subscription-only features without an active plan. |
| Actions that do not make sense in the business context | Implementing | Examples include impossible order parameters or invalid admin/user state transitions. |
| Attempts to exceed limitations for particular actions | Implementing | This includes rate-limit hits and repeated auth abuse patterns. |

### Optionally Log

| OWASP item | Decision | Project-specific note |
| --- | --- | --- |
| Sequencing failure | Implementing | This is useful for auth and order flows where step order matters. |
| Excessive use | Implementing | This complements rate limiting and helps identify scraping, brute force, or abusive API access. |
| Data changes | Implementing | Profile updates, plan changes, admin status changes, and similar mutations should be auditable. |
| Fraud and other criminal activities | Not implementing | The project does not currently include a fraud-detection engine, so we are not pretending to classify events as fraud at this stage. |
| Suspicious, unacceptable, or unexpected behavior | Implementing | We will log suspicious security behavior even when it does not map cleanly to a single auth or validation failure. |
| Modifications to configuration | Not implementing | Configuration changes are handled by deployment/environment management outside the app, so they are better captured by infrastructure controls than by application code. |
| Application code file and/or memory changes | Not implementing | This is a host/infrastructure integrity-monitoring concern, not an application-layer logging responsibility in this repo. |

## Event Attributes

The project will use a compact structured event shape across stdout logs and database-backed audit records. When a field is not suitable for a given sink, we will omit it rather than store unsafe or low-value data.

| OWASP item | Decision | Project-specific note |
| --- | --- | --- |
| Log date and time | Implementing | Every log record should include server-side UTC time. Existing database tables already use `created_at`, and Python service logs include timestamps. |
| Event date and time | Implementing | We will record a separate event time when it differs from write time, which matters for market data and delayed pipeline processing. |
| Interaction identifier | Implementing | A request or correlation ID should link all logs produced by one HTTP request or pipeline interaction. |
| Application identifier | Implementing | We will include the emitting app/service name such as `fullstack-backend`, `inflow-gateway`, or `transform-layer`. |
| Application address | Not implementing | This project is currently single-environment and developer-hosted; hostname/IP/port adds little value for the current scope. |
| Service name and protocol | Implementing | We will include the route/service context, for example REST endpoint, websocket stream, Redis, or Kafka. |
| Geolocation | Not implementing | We are deliberately not enriching events with geolocation because it adds privacy cost and the project does not have a trustworthy geo-IP service. |
| Window/form/page | Implementing | For web/API actions, we will store the route or page context that triggered the event. |
| Code location | Implementing | Module or handler context is useful for debugging and can be captured via logger name or controller/middleware name. |
| Source address | Implementing | We will capture client IP where available and appropriate, plus machine/source context for internal service events. |
| User identity | Implementing | Use internal identifiers such as `user_id`, `admin_id`, or service identity instead of raw secrets. |
| Type of event | Implementing | Use stable event/action names such as auth, admin, subscription, report, order, or pipeline-failure events. |
| Severity of event | Implementing | Runtime logs should carry levels such as `INFO`, `WARN`, and `ERROR`. |
| Security-relevant event flag | Implementing | This helps distinguish security/audit records from general operational events when the same sink stores both. |
| Description | Implementing | Every event should have a short human-readable summary. |
| Secondary time source | Not implementing | The application runs on server-side infrastructure we control, so a second trusted time source is not needed in this project. |
| Action | Implementing | Record the intended action, such as login, verify MFA, update profile, execute order, or generate report. |
| Object | Implementing | Record the affected object where relevant, such as user account, market, report, or subscription. |
| Result status | Implementing | Record whether the action succeeded, failed, or was denied. |
| Reason | Implementing | Record a safe summary reason for failures and denials, such as invalid token, expired MFA code, or subscription required. |
| HTTP status code | Implementing | For backend HTTP events, store the response status code. |
| Request HTTP headers or HTTP User Agent | Implementing | We will capture user agent and only the minimum request-header context needed for investigation, not full header dumps by default. |
| User type classification | Implementing | Distinguish anonymous, authenticated user, admin, and internal service activity where applicable. |
| Analytical confidence in the event detection | Not implementing | The project does not have a confidence-scored detection engine, so this field would be artificial. |
| Responses seen by the user and/or taken by the application | Implementing | Record high-level outcomes such as account disabled, token rejected, report queued, or session terminated. |
| Extended details such as stack trace, raw request body, raw response body, or debug dump | Not implementing | These details are too sensitive and too noisy for the default logs. If needed for debugging, they should stay in local development only, not in durable audit records. |
| Internal classifications | Not implementing | The project does not currently maintain a formal internal compliance taxonomy for log records. |
| External classifications such as SCAP or CAPEC | Not implementing | This is unnecessary overhead for the current course-project scope. |

## Project-Specific Implementation Notes

- PostgreSQL audit/event storage will continue to center on `admin_actions`, `system_events`, and `user_activity`.
- Service runtime logs should remain in stdout/stderr so they work cleanly in local development and containerized execution.
- Sensitive data such as passwords, MFA codes, JWTs, OAuth access tokens, and raw payment credentials must not be logged.
- When the current prototype evolves into a production deployment, the first logging hardening steps should be:
  - a shared structured logging helper for the Node backend
  - request/correlation IDs
  - a separate write-only database account for durable log tables
  - export of operational/security logs to a centralized collector
