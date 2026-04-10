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
// POST /v1/orders/execute
// ─────────────────────────────────────────────
describe('POST /v1/orders/execute', () => {
  const URL = '/v1/orders/execute';

  test('201 — successful order', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ event_id: 1, event_type: 'order', amount: 100, status: 'pending', description: '{}', created_at: new Date().toISOString() }],
      })
      .mockResolvedValueOnce({ rows: [] }) // user_stats upsert
      .mockResolvedValueOnce({ rows: [] }); // activity log

    const res = await request(app).post(URL).set(AUTH).send({ market_id: 'btc-yes', side: 'buy', amount: 100 });
    expect(res.status).toBe(201);
    expect(res.body.order).toHaveProperty('event_id');
  });

  test('400 — missing market_id', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ side: 'buy', amount: 100 });
    expect(res.status).toBe(400);
  });

  test('400 — missing side', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ market_id: 'btc', amount: 100 });
    expect(res.status).toBe(400);
  });

  test('400 — missing amount', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ market_id: 'btc', side: 'buy' });
    expect(res.status).toBe(400);
  });

  test('400 — invalid side value', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ market_id: 'btc', side: 'hold', amount: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/side/i);
  });

  test('400 — negative amount', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ market_id: 'btc', side: 'buy', amount: -50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive/i);
  });

  test('400 — zero amount', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ market_id: 'btc', side: 'buy', amount: 0 });
    expect(res.status).toBe(400);
  });

  test('400 — empty body', async () => {
    const res = await request(app).post(URL).set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('401 — no auth', async () => {
    const res = await request(app).post(URL).send({ market_id: 'btc', side: 'buy', amount: 100 });
    expect(res.status).toBe(401);
  });

  test('500 — database error', async () => {
    db.query.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app).post(URL).set(AUTH).send({ market_id: 'btc', side: 'buy', amount: 100 });
    expect(res.status).toBe(500);
  });
});
