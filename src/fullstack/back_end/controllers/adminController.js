const crypto = require('crypto');
const db = require('../db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function parsePositiveInt(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function capitalizeWord(value) {
  const stringValue = String(value || '');
  return stringValue ? stringValue.charAt(0).toUpperCase() + stringValue.slice(1) : stringValue;
}

function formatDate(value) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime(value) {
  if (!value) {
    return '--:--:--';
  }

  return new Date(value).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0.0%';
  }

  const numericValue = Number(value);
  const resolvedPercent = numericValue <= 1 ? numericValue * 100 : numericValue;
  return `${resolvedPercent.toFixed(1)}%`;
}

function humanizeLabel(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => capitalizeWord(word))
    .join(' ');
}

function normalizePlanLabel(plan) {
  const key = String(plan || '').toLowerCase();

  if (key === 'premium' || key === 'pro') {
    return 'Pro';
  }

  if (key === 'institutional' || key === 'elite') {
    return 'Elite';
  }

  if (key === 'free') {
    return 'Free';
  }

  return humanizeLabel(key || 'unknown');
}

function normalizeSystemStatus(status) {
  const key = String(status || '').toLowerCase();

  if (['completed', 'success', 'succeeded', 'active'].includes(key)) {
    return 'SUCCESS';
  }

  if (['failed', 'error', 'disabled'].includes(key)) {
    return 'ERROR';
  }

  if (['pending', 'paused', 'warning'].includes(key)) {
    return 'WARN';
  }

  return key ? key.toUpperCase() : 'SUCCESS';
}

function normalizeUserRole(role) {
  const key = String(role || '').trim().toLowerCase();
  if (key === 'admin') {
    return 'admin';
  }
  return 'user';
}

function normalizeStoredPlan(plan) {
  const key = String(plan || '').trim().toLowerCase();

  if (['elite', 'institutional'].includes(key)) {
    return 'elite';
  }

  if (['pro', 'premium'].includes(key)) {
    return 'pro';
  }

  return 'free';
}

async function recordAdminAction(req, targetUserId, actionType, metadata = {}) {
  const adminId = Number(req.user?.user_id);

  if (!Number.isInteger(adminId) || adminId <= 0) {
    return;
  }

  await db.query(
    `INSERT INTO admin_actions (admin_id, target_user_id, action_type, metadata)
     VALUES ($1, $2, $3, $4)`,
    [adminId, targetUserId || null, actionType, metadata]
  );
}

function formatAdminActionType(actionType, metadata = {}) {
  if (actionType === 'update_user_status') {
    return String(metadata.status || '').toLowerCase() === 'disabled'
      ? 'Account Disabled'
      : 'Account Enabled';
  }

  if (actionType === 'reset_user_password') {
    return 'Password Reset';
  }

  return humanizeLabel(actionType);
}

function formatLegacyUserRow(row) {
  return {
    id: `U-${String(row.user_id).padStart(3, '0')}`,
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    plan: normalizePlanLabel(row.plan),
    joined: formatDate(row.created_at),
    lastLogin: formatDate(row.last_login),
    trades: Number(row.total_trades || 0),
    status: String(row.status || '').toUpperCase(),
  };
}

async function queryUsers({ limit, offset, search }) {
  const params = [];
  let whereClause = '';

  if (search) {
    params.push(`%${search}%`);
    whereClause = `WHERE u.name ILIKE $1 OR u.email ILIKE $1 OR COALESCE(u.phone, '') ILIKE $1`;
  }

  const usersResult = await db.query(
    `SELECT
        u.user_id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.plan,
        u.created_at,
        u.last_login,
        COALESCE(us.total_trades, 0) AS total_trades
     FROM users u
     LEFT JOIN user_stats us ON us.user_id = u.user_id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const summaryResult = await db.query(
    `SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_users,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_users,
        COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled_users
     FROM users
     ${search ? `WHERE name ILIKE $1 OR email ILIKE $1 OR COALESCE(phone, '') ILIKE $1` : ''}`,
    search ? [`%${search}%`] : []
  );

  return {
    users: usersResult.rows,
    summary: summaryResult.rows[0],
  };
}

exports.listUsers = async (req, res, next) => {
  const limit = parsePositiveInt(req.query.limit, 25, { min: 1, max: 100 });
  const offset = parsePositiveInt(req.query.offset, 0, { min: 0 });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  try {
    const { users, summary } = await queryUsers({ limit, offset, search });

    return res.json({
      users,
      pagination: {
        limit,
        offset,
        returned: users.length,
      },
      summary,
      search: search || null,
    });
  } catch (err) {
    return next(err);
  }
};

exports.listUsersLegacy = async (req, res, next) => {
  const limit = parsePositiveInt(req.query.limit, 25, { min: 1, max: 100 });
  const offset = parsePositiveInt(req.query.offset, 0, { min: 0 });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  try {
    const { users } = await queryUsers({ limit, offset, search });
    return res.json(users.map(formatLegacyUserRow));
  } catch (err) {
    return next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  const targetUserId = parseInt(req.params.id, 10);
  const status = String(req.body.status || '').trim().toLowerCase();

  if (!Number.isInteger(targetUserId)) {
    return res.status(400).json({ error: 'User id must be a valid integer' });
  }

  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'status must be "active" or "disabled"' });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET status = $1
       WHERE user_id = $2
       RETURNING user_id, name, email, role, status, plan`,
      [status, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await recordAdminAction(req, targetUserId, 'update_user_status', { status });

    return res.json({
      message: 'User status updated',
      user: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  const targetUserId = parseInt(req.params.id, 10);

  if (!Number.isInteger(targetUserId)) {
    return res.status(400).json({ error: 'User id must be a valid integer' });
  }

  try {
    const userResult = await db.query(
      'SELECT user_id, email, name FROM users WHERE user_id = $1',
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `INSERT INTO password_resets (user_id, reset_token, expires_at)
       VALUES ($1, $2, $3)`,
      [targetUserId, resetToken, expiresAt]
    );

    await recordAdminAction(req, targetUserId, 'reset_user_password', {
      expires_at: expiresAt.toISOString(),
    });

    return res.json({
      message: 'Password reset link generated',
      reset_requested: true,
      user: userResult.rows[0],
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    return next(err);
  }
};

exports.createUser = async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const plan = normalizeStoredPlan(req.body.plan);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    const existingUser = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, status, plan)
       VALUES ($1, $2, $3, 'user', 'active', $4)
       RETURNING user_id, name, email, phone, role, status, plan, created_at, last_login`,
      [name, email, hashPassword(password), plan]
    );

    await recordAdminAction(req, result.rows[0].user_id, 'create_user', {
      email,
      plan,
    });

    return res.status(201).json({
      message: 'User created',
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    return next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  const targetUserId = parseInt(req.params.id, 10);
  const role = normalizeUserRole(req.body.role);

  if (!Number.isInteger(targetUserId)) {
    return res.status(400).json({ error: 'User id must be a valid integer' });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET role = $1
       WHERE user_id = $2
       RETURNING user_id, name, email, phone, role, status, plan, created_at, last_login`,
      [role, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await recordAdminAction(req, targetUserId, 'update_user_role', { role });

    return res.json({
      message: 'User role updated',
      user: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  const targetUserId = parseInt(req.params.id, 10);

  if (!Number.isInteger(targetUserId)) {
    return res.status(400).json({ error: 'User id must be a valid integer' });
  }

  if (req.user?.user_id === targetUserId) {
    return res.status(400).json({ error: 'You cannot delete your own admin account' });
  }

  try {
    const existingUser = await db.query(
      'SELECT user_id, name, email, role, status, plan FROM users WHERE user_id = $1',
      [targetUserId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await recordAdminAction(req, targetUserId, 'delete_user', {
      email: existingUser.rows[0].email,
      role: existingUser.rows[0].role,
    });

    await db.query('DELETE FROM users WHERE user_id = $1', [targetUserId]);

    return res.json({
      message: 'User deleted',
      user: existingUser.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};

exports.listTransactions = async (req, res, next) => {
  const limit = parsePositiveInt(req.query.limit, 25, { min: 1, max: 100 });

  try {
    const [systemEventsResult, adminActionsResult] = await Promise.all([
      db.query(
        `SELECT
            e.event_id,
            e.event_type,
            e.amount,
            e.status,
            e.description,
            e.created_at,
            u.email
         FROM system_events e
         LEFT JOIN users u ON u.user_id = e.user_id
         ORDER BY e.created_at DESC
         LIMIT $1`,
        [limit]
      ),
      db.query(
        `SELECT
            a.action_id,
            a.action_type,
            a.metadata,
            a.created_at,
            u.email
         FROM admin_actions a
         LEFT JOIN users u ON u.user_id = a.target_user_id
         ORDER BY a.created_at DESC
         LIMIT $1`,
        [limit]
      ),
    ]);

    const systemEvents = systemEventsResult.rows.map(row => ({
      id: `SYS-${row.event_id}`,
      time: formatTime(row.created_at),
      type: row.description || humanizeLabel(row.event_type),
      user: row.email || 'System',
      amount: formatCurrency(row.amount),
      status: normalizeSystemStatus(row.status),
      created_at: row.created_at,
    }));

    const adminActions = adminActionsResult.rows.map(row => {
      const actionType = formatAdminActionType(row.action_type, row.metadata);
      const actionStatus =
        row.action_type === 'update_user_status' && String(row.metadata?.status || '').toLowerCase() === 'disabled'
          ? 'WARN'
          : 'SUCCESS';

      return {
        id: `SYS-${row.action_id}`,
        time: formatTime(row.created_at),
        type: actionType,
        user: row.email || 'System',
        amount: '—',
        status: actionStatus,
        created_at: row.created_at,
      };
    });

    const transactions = [...systemEvents, ...adminActions]
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
      .slice(0, limit)
      .map(({ created_at, ...rest }) => rest);

    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
};

exports.getPlatformOverview = async (_req, res, next) => {
  try {
    const [
      revenueResult,
      monthlyRevenueResult,
      averageTradesResult,
      latestMetricsResult,
      planDistributionResult,
      topTradersResult,
      dauResult,
    ] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(amount), 0) AS revenue
         FROM payments
         WHERE status = 'completed'`
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0) AS mrr
         FROM payments
         WHERE status = 'completed'
           AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)`
      ),
      db.query(
        `SELECT COALESCE(ROUND(AVG(total_trades))::int, 0) AS avg_trades
         FROM user_stats
         WHERE total_trades > 0`
      ),
      db.query(
        `SELECT churn_rate, conversion_rate
         FROM platform_metrics
         ORDER BY metric_date DESC
         LIMIT 1`
      ),
      db.query(
        `SELECT plan, COUNT(*)::int AS count
         FROM users
         GROUP BY plan
         ORDER BY count DESC, plan ASC`
      ),
      db.query(
        `SELECT
            u.name,
            COALESCE(us.total_trades, 0)::int AS trades
         FROM users u
         LEFT JOIN user_stats us ON us.user_id = u.user_id
         ORDER BY trades DESC, u.name ASC
         LIMIT 5`
      ),
      db.query(
        `SELECT
            DATE(created_at) AS activity_date,
            COUNT(DISTINCT user_id)::int AS count
         FROM user_activity
         WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY DATE(created_at)
         ORDER BY activity_date ASC`
      ),
    ]);

    const latestMetrics = latestMetricsResult.rows[0] || {};
    const totalPlanUsers = planDistributionResult.rows.reduce((sum, row) => sum + Number(row.count || 0), 0) || 1;
    const dauByDate = new Map(
      dauResult.rows.map(row => [new Date(row.activity_date).toISOString().slice(0, 10), Number(row.count || 0)])
    );

    const dau = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);

      return {
        day: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' }),
        count: dauByDate.get(key) || 0,
      };
    });

    return res.json({
      revenue: formatCurrency(revenueResult.rows[0]?.revenue),
      mrr: formatCurrency(monthlyRevenueResult.rows[0]?.mrr),
      avgTrades: Number(averageTradesResult.rows[0]?.avg_trades || 0),
      churnRate: formatPercent(latestMetrics.churn_rate),
      conversionRate: formatPercent(latestMetrics.conversion_rate),
      planDist: planDistributionResult.rows.map(row => ({
        label: normalizePlanLabel(row.plan),
        count: Number(row.count || 0),
        pct: Math.round((Number(row.count || 0) / totalPlanUsers) * 100),
      })),
      topTraders: topTradersResult.rows.map((row, index) => ({
        rank: index + 1,
        name: row.name,
        trades: Number(row.trades || 0),
      })),
      dau,
    });
  } catch (err) {
    return next(err);
  }
};
