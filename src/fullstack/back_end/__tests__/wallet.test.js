const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn(), end: jest.fn() },
}));

const db = require('../db');
const { app } = require('../app');

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-change-me', {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

const TOKEN = makeToken({ user_id: 1, email: 'a@b.com', role: 'user' });
const AUTH = { Authorization: `Bearer ${TOKEN}` };

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// GET /v1/wallet/overview
// ─────────────────────────────────────────────
describe('GET /v1/wallet/overview', () => {
  const URL = '/v1/wallet/overview';

  test('200 — returns wallet metrics', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total_trades: 5, total_volume: 1000, last_active: '2026-01-01' }] })
      .mockResolvedValueOnce({ rows: [{ total_deposited: '500.00' }] })
      .mockResolvedValueOnce({ rows: [{ total_orders: '300.00' }] });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_trades', 5);
    expect(res.body).toHaveProperty('pnl');
    expect(typeof res.body.pnl).toBe('number');
  });

  test('200 — handles empty stats (new user)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })                           // no stats
      .mockResolvedValueOnce({ rows: [{ total_deposited: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total_orders: '0' }] });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.total_trades).toBe(0);
  });

  test('401 — no auth', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /v1/wallet/history
// ─────────────────────────────────────────────
describe('GET /v1/wallet/history', () => {
  const URL = '/v1/wallet/history';

  test('200 — returns history array', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { event_id: 1, event_type: 'order', amount: 50, status: 'completed', description: '{}', created_at: '2026-01-01' },
      ],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('200 — filters by market query param', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${URL}?market=btc`).set(AUTH);
    expect(res.status).toBe(200);
    // Verify the market filter was passed to the query
    const queryStr = db.query.mock.calls[0][0];
    expect(queryStr).toContain('LIKE');
  });

  test('401 — no auth', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });
});
