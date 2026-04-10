const db = require('../db');

// GET /v1/wallet/overview — get wallet performance metrics
exports.getOverview = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    // Get user stats
    const statsResult = await db.query(
      'SELECT total_trades, total_volume, last_active FROM user_stats WHERE user_id = $1',
      [userId]
    );

    // Get total payments (deposits)
    const paymentsResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_deposited
       FROM payments WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );

    // Get order history for P&L
    const ordersResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_orders
       FROM system_events WHERE user_id = $1 AND event_type = 'order' AND status = 'completed'`,
      [userId]
    );

    const stats = statsResult.rows[0] || { total_trades: 0, total_volume: 0, last_active: null };
    const totalDeposited = parseFloat(paymentsResult.rows[0].total_deposited);
    const totalOrders = parseFloat(ordersResult.rows[0].total_orders);

    return res.json({
      total_trades: stats.total_trades,
      total_volume: stats.total_volume,
      total_deposited: totalDeposited,
      pnl: totalDeposited - totalOrders,
      last_active: stats.last_active,
    });
  } catch (err) {
    return next(err);
  }
};

// GET /v1/wallet/history — get historical data for wallet chart
exports.getHistory = async (req, res, next) => {
  const userId = req.user.user_id;
  const { market, limit = 100 } = req.query;

  try {
    let query = `
      SELECT event_id, event_type, amount, status, description, created_at
      FROM system_events
      WHERE user_id = $1 AND event_type = 'order'
    `;
    const params = [userId];

    if (market) {
      query += ` AND description LIKE $${params.length + 1}`;
      params.push(`%${market}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit, 10));

    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
};
