const analyticsService = require('../services/analyticsService');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

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

const parseStringList = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : String(value).split(',');
  const normalized = values
    .map((item) => String(item).trim())
    .filter(Boolean);

  if (!normalized.length) {
    return undefined;
  }

  return normalized.length === 1 ? normalized[0] : normalized;
};

const parseBoolean = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const candidate = String(firstValue(value)).trim().toLowerCase();

  if (candidate === 'true' || candidate === '1') {
    return true;
  }

  if (candidate === 'false' || candidate === '0') {
    return false;
  }

  throw createValidationError(`${fieldName} must be a boolean`);
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

const parseRequiredDate = (value, fieldName) => {
  const candidate = firstValue(value);

  if (!candidate) {
    throw createValidationError(`${fieldName} is required`);
  }

  const parsed = new Date(candidate);

  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError(`${fieldName} must be a valid ISO date/time`);
  }

  return parsed.toISOString();
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = new Date(firstValue(value));

  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError(`${fieldName} must be a valid ISO date/time`);
  }

  return parsed.toISOString();
};

exports.getChainlinkPrices = async (req, res, next) => {
  try {
    const symbol = parseOptionalString(req.query.symbol);
    if (!symbol) {
      throw createValidationError('symbol is required');
    }

    const latest = parseBoolean(req.query.latest, 'latest') ?? false;
    const start = parseOptionalDate(req.query.start, 'start');
    const end = parseOptionalDate(req.query.end, 'end');

    if (latest) {
      if (start || end) {
        throw createValidationError('latest cannot be combined with start or end');
      }
    } else {
      if (!start && !end) {
        throw createValidationError('Provide start and end, or use latest=true');
      }

      if (!start || !end) {
        throw createValidationError('start and end must be provided together');
      }

      if (new Date(start) >= new Date(end)) {
        throw createValidationError('start must be earlier than end');
      }
    }

    const data = await analyticsService.getChainlinkPrices({
      symbol,
      start,
      end,
      latest,
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: 1000, min: 1, max: 10000 }),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getBinancePrices = async (req, res, next) => {
  try {
    const data = await analyticsService.getBinancePrices({
      symbol: parseOptionalString(req.query.symbol),
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, min: 1, max: MAX_LIMIT }),
      offset: parseInteger(req.query.offset, 'offset', { defaultValue: 0, min: 0 }),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getMarkets = async (req, res, next) => {
  try {
    const data = await analyticsService.getMarkets({
      slug: parseOptionalString(req.query.slug),
      closed: parseBoolean(req.query.closed, 'closed'),
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, min: 1, max: MAX_LIMIT }),
      offset: parseInteger(req.query.offset, 'offset', { defaultValue: 0, min: 0 }),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getMarketDepthVolumeChart = async (req, res, next) => {
  try {
    const data = await analyticsService.getMarketDepthVolumeChart({
      marketId: parseRequiredString(req.query.market_id, 'market_id'),
      assetId: parseRequiredString(req.query.asset_id, 'asset_id'),
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, min: 1, max: 10000 }),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getTrades = async (req, res, next) => {
  try {
    const data = await analyticsService.getTrades({
      market: parseStringList(req.query.market),
      takerOnly: parseBoolean(req.query.takerOnly, 'takerOnly'),
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, min: 1, max: MAX_LIMIT }),
      offset: parseInteger(req.query.offset, 'offset', { defaultValue: 0, min: 0 }),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const data = await analyticsService.getEvents({
      slug: parseOptionalString(req.query.slug),
      closed: parseBoolean(req.query.closed, 'closed'),
      tag_id: parseOptionalString(req.query.tag_id),
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, min: 1, max: MAX_LIMIT }),
      offset: parseInteger(req.query.offset, 'offset', { defaultValue: 0, min: 0 }),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getSeries = async (req, res, next) => {
  try {
    const data = await analyticsService.getSeries({
      limit: parseInteger(req.query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, min: 1, max: MAX_LIMIT }),
      offset: parseInteger(req.query.offset, 'offset', { defaultValue: 0, min: 0 }),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getData = async (req, res, next) => {
  try {
    const startTime = parseRequiredDate(req.query.startTime, 'startTime');
    const endTime = parseRequiredDate(req.query.endTime, 'endTime');

    if (new Date(startTime) >= new Date(endTime)) {
      throw createValidationError('startTime must be before endTime');
    }

    const data = await analyticsService.getData({
      startTime,
      endTime,
      market: parseStringList(req.query.market),
      interval: parseOptionalString(req.query.interval),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
