// ─── OBAnalyzer Frontend Logger ───────────────────────────────────────────────
// Sends security-relevant client events to POST /api/analytics/logs/client
// All entries follow the schema defined in log_design.md
// Server stamps the final datetime — client timestamp is advisory only.

const LOG_ENDPOINT = 'https://api.yourbackend.com/api/analytics/logs/client';

// Sanitise a string value to prevent log injection (CR, LF, delimiters)
const sanitize = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/[\r\n\t|;]/g, '_').substring(0, 512);
};

// Build a base log entry — fields match the schema in log_design.md
const buildEntry = (event, level, description, extra = {}) => ({
  clientTime:  new Date().toISOString(),        // advisory only — server re-stamps
  appid:       'obanalyzer.frontend',
  level:       sanitize(level),
  event:       sanitize(event),
  userId:      sanitize(localStorage.getItem('ob_user_name') || 'anonymous'),
  userRole:    sanitize(localStorage.getItem('ob_user_role')  || 'unknown'),
  outcome:     sanitize(extra.outcome || 'unknown'),
  description: sanitize(description),
  ...Object.fromEntries(
    Object.entries(extra)
      .filter(([k]) => k !== 'outcome')
      .map(([k, v]) => [k, sanitize(String(v))])
  ),
});

// Fire-and-forget POST — logging failures must never break the application
const send = async (entry) => {
  try {
    await fetch(LOG_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token') || ''}`,
      },
      body: JSON.stringify(entry),
    });
  } catch (_) {
    // Silently swallow — logging failure must not surface to user or crash UI
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

window.Logger = {

  // Authentication
  loginAttempt:  (email) =>
    send(buildEntry('authn_login_attempt', 'INFO',
      'User initiated login', { endpoint: 'POST /v1/auth/login', outcome: 'attempt' })),

  loginSuccess:  () =>
    send(buildEntry('authn_login_success', 'INFO',
      'User authenticated successfully via MFA', { endpoint: 'POST /v1/auth/verify-mfa', outcome: 'success' })),

  loginFailure:  (reason) =>
    send(buildEntry('authn_login_failure', 'WARN',
      'Authentication failed: ' + (reason || 'unknown'), { endpoint: 'POST /v1/auth/verify-mfa', outcome: 'failure' })),

  logout: () =>
    send(buildEntry('authn_logout', 'INFO',
      'User signed out', { outcome: 'success' })),

  // Registration
  registerAttempt: () =>
    send(buildEntry('authn_register_attempt', 'INFO',
      'New account registration initiated', { endpoint: 'POST /v1/auth/register', outcome: 'attempt' })),

  registerSuccess: () =>
    send(buildEntry('authn_register_success', 'INFO',
      'Account registered and verified', { outcome: 'success' })),

  // Authorisation
  adminAccess: () =>
    send(buildEntry('authz_admin_access', 'INFO',
      'Admin panel accessed', { endpoint: 'admin.html', outcome: 'success' })),

  adminRedirect: () =>
    send(buildEntry('authz_redirect', 'WARN',
      'Non-admin user redirected from admin panel', { endpoint: 'admin.html', outcome: 'blocked' })),

  // Trading
  orderAttempt: (market, size) =>
    send(buildEntry('order_execute_attempt', 'INFO',
      'Order execution requested', { endpoint: 'POST /v1/orders/execute', market, size, outcome: 'attempt' })),

  orderSuccess: (market, size) =>
    send(buildEntry('order_execute_success', 'INFO',
      'Order executed successfully', { endpoint: 'POST /v1/orders/execute', market, size, outcome: 'success' })),

  orderFailure: (market, reason) =>
    send(buildEntry('order_execute_failure', 'WARN',
      'Order execution failed: ' + (reason || 'unknown'), { market, outcome: 'failure' })),

  // Billing
  subscribeAttempt: (plan, cycle) =>
    send(buildEntry('subscription_upgrade_attempt', 'INFO',
      'Subscription upgrade initiated', { plan, cycle, outcome: 'attempt' })),

  subscribeSuccess: (plan) =>
    send(buildEntry('subscription_upgrade_success', 'INFO',
      'Subscription upgraded', { plan, outcome: 'success' })),

  // Reports
  reportRequest: (template, format) =>
    send(buildEntry('report_generate_request', 'INFO',
      'Report generation requested', { template, format, outcome: 'attempt' })),

  // Client errors
  clientError: (message, source) =>
    send(buildEntry('client_error', 'ERROR',
      'Unhandled client error', { message: message || 'unknown', source: source || 'unknown', outcome: 'error' })),
};

// Global error handler — catches unhandled JS errors across all pages
window.onerror = (message, source, lineno) => {
  window.Logger.clientError(message, source + ':' + lineno);
  return false; // Don't suppress the error from the console
};

window.onunhandledrejection = (event) => {
  window.Logger.clientError('Unhandled promise rejection: ' + event.reason, 'promise');
};