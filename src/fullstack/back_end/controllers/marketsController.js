const { gamma } = require('../config/upstream');
const marketsService = require('../services/marketsService');

const createValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

const parseOptionalString = (value) => {
  const candidate = firstValue(value);

  if (candidate === undefined || candidate === null) {
    return undefined;
  }

  const trimmed = String(candidate).trim();
  return trimmed ? trimmed : undefined;
};

const parseRequiredString = (value, fieldName) => {
  const candidate = parseOptionalString(value);

  if (!candidate) {
    throw createValidationError(`${fieldName} is required`);
  }

  return candidate;
};

const parseInteger = (value, fieldName, { defaultValue, min = 0, max } = {}) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(firstValue(value), 10);

  if (!Number.isInteger(parsed)) {
    throw createValidationError(`${fieldName} must be an integer`);
  }

  if (parsed < min) {
    throw createValidationError(`${fieldName} must be greater than or equal to ${min}`);
  }

  if (max !== undefined && parsed > max) {
    throw createValidationError(`${fieldName} must be less than or equal to ${max}`);
  }

  return parsed;
};

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

exports.getContracts = async (req, res, next) => {
  try {
    const data = await marketsService.listContracts({
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: 25, min: 1, max: 500 }),
    });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

exports.getTerminalMarketData = async (req, res, next) => {
  try {
    const data = await marketsService.getTerminalMarketData({
      marketId: parseRequiredString(req.query.market_id, 'market_id'),
      assetId: parseRequiredString(req.query.asset_id, 'asset_id'),
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: 1000, min: 1, max: 1000 }),
    });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};
