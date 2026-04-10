const db = require('../db');

// POST /v1/billing/subscribe — process subscription payment, update user plan
exports.subscribe = async (req, res, next) => {
  const userId = req.user.user_id;
  const { plan, payment_type } = req.body;

  if (!plan || !['free', 'premium', 'institutional'].includes(plan)) {
    return res.status(400).json({ error: 'plan must be one of: free, premium, institutional' });
  }

  const planPrices = { free: 0, premium: 29.99, institutional: 99.99 };
  const amount = planPrices[plan];

  try {
    // Create payment record
    if (amount > 0) {
      await db.query(
        `INSERT INTO payments (user_id, amount, status, payment_type)
         VALUES ($1, $2, 'completed', $3)`,
        [userId, amount, payment_type || 'card']
      );
    }

    // Create subscription record
    await db.query(
      `INSERT INTO subscriptions (user_id, plan, start_date, status)
       VALUES ($1, $2, NOW(), 'active')`,
      [userId, plan]
    );

    // Update user plan
    await db.query('UPDATE users SET plan = $1 WHERE user_id = $2', [plan, userId]);

    // Log system event
    await db.query(
      `INSERT INTO system_events (event_type, user_id, amount, status, description)
       VALUES ('subscription', $1, $2, 'completed', $3)`,
      [userId, amount, `Subscribed to ${plan} plan`]
    );

    return res.json({ message: 'Subscription activated', plan, amount });
  } catch (err) {
    return next(err);
  }
};

// GET /v1/transactions — get user's payment/billing history
exports.getTransactions = async (req, res, next) => {
  const userId = req.user.user_id;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await db.query(
      `SELECT payment_id, amount, currency, status, payment_type, created_at
       FROM payments WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
};

// GET /v1/reports/metrics — get platform-level summary metrics
exports.getMetrics = async (req, res, next) => {
  const { start, end } = req.query;

  try {
    let query = 'SELECT * FROM platform_metrics';
    const params = [];

    if (start && end) {
      query += ' WHERE metric_date BETWEEN $1 AND $2';
      params.push(start, end);
    }

    query += ' ORDER BY metric_date DESC LIMIT 30';

    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
};

// POST /v1/reports/generate — trigger report generation
exports.generateReport = async (req, res, next) => {
  const userId = req.user.user_id;
  const { start_date, end_date, report_type = 'summary' } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  try {
    // Aggregate user's data for the period
    const tradesResult = await db.query(
      `SELECT COUNT(*) AS trade_count, COALESCE(SUM(amount), 0) AS total_volume
       FROM system_events
       WHERE user_id = $1 AND event_type = 'order'
         AND created_at BETWEEN $2 AND $3`,
      [userId, start_date, end_date]
    );

    const paymentsResult = await db.query(
      `SELECT COUNT(*) AS payment_count, COALESCE(SUM(amount), 0) AS total_paid
       FROM payments
       WHERE user_id = $1 AND created_at BETWEEN $2 AND $3`,
      [userId, start_date, end_date]
    );

    const report = {
      report_type,
      period: { start_date, end_date },
      trades: tradesResult.rows[0],
      payments: paymentsResult.rows[0],
      generated_at: new Date().toISOString(),
    };

    // Log report generation event
    await db.query(
      `INSERT INTO system_events (event_type, user_id, status, description)
       VALUES ('report_generated', $1, 'completed', $2)`,
      [userId, JSON.stringify({ report_type, start_date, end_date })]
    );

    // TODO: upload to AWS S3 and return download link
    return res.json({ report, download_url: null });
  } catch (err) {
    return next(err);
  }
};
