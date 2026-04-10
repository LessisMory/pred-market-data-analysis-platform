const db = require('../db');

async function requireSubscription(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const result = await db.query(
      `SELECT plan FROM users WHERE user_id = $1 AND status = 'active'`,
      [req.user.user_id]
    );

    if (result.rows.length === 0 || result.rows[0].plan === 'free') {
      return res.status(403).json({ error: 'Active subscription required to access this resource' });
    }

    req.subscription = result.rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = requireSubscription;
