const { dataService, gamma, requestTimeoutMs } = require('../config/upstream');

class UpstreamApiError extends Error {
  constructor(message, { status = 500, service, details } = {}) {
    super(message);
    this.name = 'UpstreamApiError';
    this.status = status;
    this.service = service;
    this.details = details;
  }
}

const getFetch = () => {
  if (typeof fetch !== 'function') {
    throw new UpstreamApiError('Global fetch is unavailable. Run this backend with Node.js 18+.', {
      status: 500,
      service: 'runtime',
    });
  }

  return fetch;
};

const appendQueryValue = (searchParams, key, value) => {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(searchParams, key, item));
    return;
  }

  searchParams.append(key, String(value));
};

const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`);

const buildUrl = (baseUrl, path, query = {}) => {
  const url = new URL(normalizePath(path), baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    appendQueryValue(url.searchParams, key, value);
  });

  return url;
};

const parseErrorBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (_error) {
    return null;
  }
};

const requestJson = async ({ serviceName, baseUrl, path, query }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await getFetch()(buildUrl(baseUrl, path, query), {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await parseErrorBody(response);
      throw new UpstreamApiError(
        `${serviceName} request failed with status ${response.status}`,
        {
          status: response.status === 404 ? 502 : response.status,
          service: serviceName,
          details,
        }
      );
    }

    try {
      return await response.json();
    } catch (error) {
      throw new UpstreamApiError(`${serviceName} returned invalid JSON`, {
        status: 502,
        service: serviceName,
        details: error.message,
      });
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new UpstreamApiError(`${serviceName} request timed out`, {
        status: 504,
        service: serviceName,
      });
    }

    if (error instanceof UpstreamApiError) {
      throw error;
    }

    throw new UpstreamApiError(`Unable to reach ${serviceName}`, {
      status: 502,
      service: serviceName,
      details: error.message,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeListPayload = (payload, candidates = []) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  for (const key of candidates) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return payload;
};

const normalizeDataPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
};

exports.getChainlinkPrices = async ({ symbol, start, end, latest, limit }) => {
  const payload = await requestJson({
    serviceName: 'data_service',
    baseUrl: dataService.baseUrl,
    path: dataService.paths.chainlinkPrices,
    query: { symbol, start, end, latest, limit },
  });

  return payload;
};

exports.getBinancePrices = async ({ symbol, limit, offset }) => {
  const payload = await requestJson({
    serviceName: 'data_service',
    baseUrl: dataService.baseUrl,
    path: dataService.paths.binancePrices,
    query: { symbol, limit, offset },
  });

  return normalizeListPayload(payload, ['rows', 'prices', 'results']);
};

exports.getMarkets = async ({ slug, closed, limit, offset }) => {
  const payload = await requestJson({
    serviceName: 'data_service',
    baseUrl: dataService.baseUrl,
    path: dataService.paths.markets,
    query: { slug, closed, limit, offset },
  });

  return normalizeListPayload(payload, ['rows', 'markets', 'results']);
};

exports.getMarketDepthVolumeChart = async ({ marketId, assetId, limit }) => {
  const payload = await requestJson({
    serviceName: 'data_service',
    baseUrl: dataService.baseUrl,
    path: dataService.paths.marketDepthVolumeChart,
    query: { market_id: marketId, asset_id: assetId, limit },
  });

  return payload;
};

exports.getTrades = async ({ market, takerOnly, limit, offset }) => {
  const payload = await requestJson({
    serviceName: 'gamma_api',
    baseUrl: gamma.baseUrl,
    path: gamma.paths.trades,
    query: { market, takerOnly, limit, offset },
  });

  return normalizeListPayload(payload, ['rows', 'trades', 'results']);
};

exports.getEvents = async ({ slug, closed, tag_id, limit, offset }) => {
  const payload = await requestJson({
    serviceName: 'gamma_api',
    baseUrl: gamma.baseUrl,
    path: gamma.paths.events,
    query: { slug, closed, tag_id, limit, offset },
  });

  return normalizeListPayload(payload, ['rows', 'events', 'results']);
};

exports.getSeries = async ({ limit, offset }) => {
  const payload = await requestJson({
    serviceName: 'gamma_api',
    baseUrl: gamma.baseUrl,
    path: gamma.paths.series,
    query: { limit, offset },
  });

  return normalizeListPayload(payload, ['rows', 'series', 'results']);
};

exports.getData = async ({ startTime, endTime, market, interval }) => {
  const payload = await requestJson({
    serviceName: 'data_service',
    baseUrl: dataService.baseUrl,
    path: dataService.paths.data,
    query: { startTime, endTime, market, interval },
  });

  return normalizeDataPayload(payload);
};

exports.UpstreamApiError = UpstreamApiError;
