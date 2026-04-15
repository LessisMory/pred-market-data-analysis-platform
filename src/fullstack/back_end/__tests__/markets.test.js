const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn(), end: jest.fn() },
}));

jest.mock('../services/analyticsService', () => ({
  getChainlinkPrices: jest.fn(),
  getBinancePrices: jest.fn(),
  getMarkets: jest.fn(),
  getMarketDepthVolumeChart: jest.fn(),
  getTrades: jest.fn(),
  getEvents: jest.fn(),
  getSeries: jest.fn(),
  getData: jest.fn(),
}));

jest.mock('../services/marketsService', () => ({
  listContracts: jest.fn(),
  getTerminalMarketData: jest.fn(),
}));

const analyticsService = require('../services/analyticsService');
const marketsService = require('../services/marketsService');
const { app } = require('../app');

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-change-me', {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

const TOKEN = makeToken({ user_id: 1, email: 'a@b.com', role: 'user' });
const AUTH = { Authorization: `Bearer ${TOKEN}` };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/analytics/prices/chainlink', () => {
  test('supports latest=true requests', async () => {
    analyticsService.getChainlinkPrices.mockResolvedValueOnce({ symbol: 'BTC/USD', data: [] });

    const res = await request(app)
      .get('/api/analytics/prices/chainlink?symbol=btc&latest=true&limit=2')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(analyticsService.getChainlinkPrices).toHaveBeenCalledWith({
      symbol: 'btc',
      start: undefined,
      end: undefined,
      latest: true,
      limit: 2,
    });
  });

  test('requires a time window when latest is not set', async () => {
    const res = await request(app)
      .get('/api/analytics/prices/chainlink?symbol=btc')
      .set(AUTH);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Provide start and end, or use latest=true');
  });

  test('rejects latest together with start/end', async () => {
    const res = await request(app)
      .get('/api/analytics/prices/chainlink?symbol=btc&latest=true&start=2026-04-13T00:00:00Z')
      .set(AUTH);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('latest cannot be combined with start or end');
  });

  test('supports explicit start/end requests', async () => {
    analyticsService.getChainlinkPrices.mockResolvedValueOnce({ symbol: 'BTC/USD', data: [] });

    const res = await request(app)
      .get('/api/analytics/prices/chainlink?symbol=btc&start=2026-04-13T00:00:00Z&end=2026-04-13T01:00:00Z&limit=5')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(analyticsService.getChainlinkPrices).toHaveBeenCalledWith({
      symbol: 'btc',
      start: '2026-04-13T00:00:00.000Z',
      end: '2026-04-13T01:00:00.000Z',
      latest: false,
      limit: 5,
    });
  });
});

describe('GET /api/analytics/markets/depth-volume-chart', () => {
  test('proxies market chart requests to the analytics service', async () => {
    analyticsService.getMarketDepthVolumeChart.mockResolvedValueOnce({ count: 0, data: [] });

    const res = await request(app)
      .get('/api/analytics/markets/depth-volume-chart?market_id=0xmarket&asset_id=123&limit=25')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(analyticsService.getMarketDepthVolumeChart).toHaveBeenCalledWith({
      marketId: '0xmarket',
      assetId: '123',
      limit: 25,
    });
  });

  test('rejects blank market ids', async () => {
    const res = await request(app)
      .get('/api/analytics/markets/depth-volume-chart?market_id=%20%20%20&asset_id=123')
      .set(AUTH);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('market_id is required');
  });
});

describe('GET /v1/markets/contracts', () => {
  test('returns terminal contract options', async () => {
    marketsService.listContracts.mockResolvedValueOnce({
      count: 1,
      data: [
        {
          slug: 'btc-updown-15m',
          marketId: '0xmarket',
          assetId: '123',
          marketName: 'Bitcoin Up or Down',
          tokenName: 'Up',
          label: 'Bitcoin Up or Down · Up',
        },
      ],
    });

    const res = await request(app)
      .get('/v1/markets/contracts?limit=10')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(marketsService.listContracts).toHaveBeenCalledWith({ limit: 10 });
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].marketId).toBe('0xmarket');
  });
});

describe('GET /v1/markets/terminal', () => {
  test('returns an empty but valid terminal payload', async () => {
    marketsService.getTerminalMarketData.mockResolvedValueOnce({
      contract: {
        slug: null,
        marketId: '0xmarket',
        assetId: '123',
        marketName: null,
        tokenName: null,
        label: '0xmarket / 123',
      },
      oracle: {
        symbol: 'BTC/USD',
        latest: null,
        previous: null,
        changePct: null,
        timestamp: null,
      },
      count: 0,
      series: [],
      latest: null,
    });

    const res = await request(app)
      .get('/v1/markets/terminal?market_id=0xmarket&asset_id=123')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(marketsService.getTerminalMarketData).toHaveBeenCalledWith({
      marketId: '0xmarket',
      assetId: '123',
      limit: 1000,
    });
  });

  test('surfaces upstream timeouts', async () => {
    const error = new Error('data_service request timed out');
    error.status = 504;
    error.service = 'data_service';
    marketsService.getTerminalMarketData.mockRejectedValueOnce(error);

    const res = await request(app)
      .get('/v1/markets/terminal?market_id=0xmarket&asset_id=123')
      .set(AUTH);

    expect(res.status).toBe(504);
    expect(res.body.error).toBe('data_service request timed out');
    expect(res.body.service).toBe('data_service');
  });

  test('surfaces upstream non-200 failures', async () => {
    const error = new Error('data_service request failed with status 404');
    error.status = 502;
    error.service = 'data_service';
    marketsService.getTerminalMarketData.mockRejectedValueOnce(error);

    const res = await request(app)
      .get('/v1/markets/terminal?market_id=0xmarket&asset_id=123')
      .set(AUTH);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('data_service request failed with status 404');
    expect(res.body.service).toBe('data_service');
  });
});
