const db = require('../db');

const PLAN_CONFIG = {
  free: { storedPlan: 'free', amount: 0, planName: 'Free' },
  premium: { storedPlan: 'premium', amount: 29.99, planName: 'Premium' },
  institutional: { storedPlan: 'institutional', amount: 99.99, planName: 'Institutional' },
  pro: { storedPlan: 'premium', amount: 9.99, planName: 'Pro' },
  elite: { storedPlan: 'institutional', amount: 29.99, planName: 'Elite' },
};

function normalizePlanSelection({ plan, planId }) {
  const key = String(plan || planId || '').trim().toLowerCase();
  return PLAN_CONFIG[key] || null;
}

function computeCharge(amount, cycle) {
  if (cycle === 'annual' && amount > 0) {
    return Number((amount * 12 * 0.8).toFixed(2));
  }

  return amount;
}

// POST /v1/billing/subscribe — process subscription payment, update user plan
exports.subscribe = async (req, res, next) => {
  const userId = req.user.user_id;
  const { plan, planId, cycle = 'monthly' } = req.body;
  const paymentType = req.body.payment_type || req.body.paymentType || 'card';
  const selectedPlan = normalizePlanSelection({ plan, planId });

  if (!selectedPlan) {
    return res.status(400).json({ error: 'plan must be one of: free, premium, institutional, pro, elite' });
  }

  const amount = computeCharge(selectedPlan.amount, cycle);

  try {
    // Create payment record
    if (amount > 0) {
      await db.query(
        `INSERT INTO payments (user_id, amount, status, payment_type)
         VALUES ($1, $2, 'completed', $3)`,
        [userId, amount, paymentType]
      );
    }

    // Create subscription record
    await db.query(
      `INSERT INTO subscriptions (user_id, plan, start_date, status)
       VALUES ($1, $2, NOW(), 'active')`,
      [userId, selectedPlan.storedPlan]
    );

    // Update user plan
    await db.query('UPDATE users SET plan = $1 WHERE user_id = $2', [selectedPlan.storedPlan, userId]);

    // Log system event
    await db.query(
      `INSERT INTO system_events (event_type, user_id, amount, status, description)
       VALUES ('subscription', $1, $2, 'completed', $3)`,
      [userId, amount, `Subscribed to ${selectedPlan.planName} plan (${cycle})`]
    );

    return res.json({
      message: 'Subscription activated',
      plan: selectedPlan.storedPlan,
      planId: planId || plan || selectedPlan.storedPlan,
      planName: selectedPlan.planName,
      cycle,
      amount,
    });
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
