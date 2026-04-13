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
