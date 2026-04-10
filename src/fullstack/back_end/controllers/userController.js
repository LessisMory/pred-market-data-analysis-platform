const db = require('../db');

// GET /v1/user/profile — get user profile + stats
exports.getProfile = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const userResult = await db.query(
      'SELECT user_id, name, email, phone, role, status, plan, created_at, last_login FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const statsResult = await db.query(
      'SELECT total_trades, total_volume, last_active FROM user_stats WHERE user_id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    const stats = statsResult.rows[0] || { total_trades: 0, total_volume: 0, last_active: null };

    return res.json({ ...user, stats });
  } catch (err) {
    return next(err);
  }
};

// GET /v1/user/activities — get user activity timeline
exports.getActivities = async (req, res, next) => {
  const userId = req.user.user_id;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await db.query(
      `SELECT activity_id, activity_type, created_at
       FROM user_activity WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
};

// PUT /v1/user/update — update user profile info
exports.updateProfile = async (req, res, next) => {
  const userId = req.user.user_id;
  const { name, email, phone } = req.body;

  if (!name && !email && !phone) {
    return res.status(400).json({ error: 'At least one field (name, email, phone) is required' });
  }

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email);
    }
    if (phone) {
      fields.push(`phone = $${idx++}`);
      values.push(phone);
    }

    values.push(userId);

    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${idx}
       RETURNING user_id, name, email, phone, role, status, plan`,
      values
    );

    // Log activity
    await db.query(
      'INSERT INTO user_activity (user_id, activity_type) VALUES ($1, $2)',
      [userId, 'profile_update']
    );

    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
};
