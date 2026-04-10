const db = require('../db');
const { gamma } = require('../config/upstream');

// GET /v1/markets/active — fetch active Polymarket contracts
exports.getActiveMarkets = async (req, res, next) => {
  try {
    const response = await fetch(`${gamma.baseUrl}${gamma.paths.events}?closed=false&limit=100`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch markets from upstream' });
    }

    const data = await response.json();
    return res.json(Array.isArray(data) ? data : data.data || data);
  } catch (err) {
    return next(err);
  }
};

// POST /v1/orders/execute — receive order params and route to matching engine
exports.executeOrder = async (req, res, next) => {
  const { market_id, side, amount } = req.body;
  const userId = req.user.user_id;

  if (!market_id || !side || !amount) {
    return res.status(400).json({ error: 'market_id, side, and amount are required' });
  }

  if (!['buy', 'sell'].includes(side)) {
    return res.status(400).json({ error: 'side must be "buy" or "sell"' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'amount must be positive' });
  }

  try {
    // Log the order as a system event
    const result = await db.query(
      `INSERT INTO system_events (event_type, user_id, amount, status, description)
       VALUES ('order', $1, $2, 'pending', $3)
       RETURNING event_id, event_type, amount, status, description, created_at`,
      [userId, amount, JSON.stringify({ market_id, side })]
    );

    // Update user stats
    await db.query(
      `INSERT INTO user_stats (user_id, total_trades, total_volume, last_active)
       VALUES ($1, 1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         total_trades = user_stats.total_trades + 1,
         total_volume = user_stats.total_volume + $2,
         last_active = NOW()`,
      [userId, amount]
    );

    // Log activity
    await db.query(
      'INSERT INTO user_activity (user_id, activity_type) VALUES ($1, $2)',
      [userId, `order_${side}`]
    );

    return res.status(201).json({ order: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};
