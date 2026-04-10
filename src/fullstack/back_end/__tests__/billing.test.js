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
// POST /v1/billing/subscribe
// ─────────────────────────────────────────────
describe('POST /v1/billing/subscribe', () => {
  const URL = '/v1/billing/subscribe';

  test('200 — subscribe to premium', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // payment insert
      .mockResolvedValueOnce({ rows: [] }) // subscription insert
      .mockResolvedValueOnce({ rows: [] }) // update user plan
      .mockResolvedValueOnce({ rows: [] }); // system event

    const res = await request(app).post(URL).set(AUTH).send({ plan: 'premium' });
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('premium');
    expect(res.body.amount).toBe(29.99);
  });

  test('200 — free plan skips payment', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // subscription
      .mockResolvedValueOnce({ rows: [] }) // update user
      .mockResolvedValueOnce({ rows: [] }); // event

    const res = await request(app).post(URL).set(AUTH).send({ plan: 'free' });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(0);
  });

  test('400 — missing plan', async () => {
    const res = await request(app).post(URL).set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('400 — invalid plan name', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ plan: 'diamond' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/plan/i);
  });

  test('400 — wrong type for plan (number)', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ plan: 123 });
    expect(res.status).toBe(400);
  });

  test('401 — no auth', async () => {
    const res = await request(app).post(URL).send({ plan: 'premium' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /v1/transactions
// ─────────────────────────────────────────────
describe('GET /v1/transactions', () => {
  const URL = '/v1/transactions';

  test('200 — returns payment list', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ payment_id: 1, amount: '29.99', currency: 'USD', status: 'completed', payment_type: 'card', created_at: '2026-01-01' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('200 — respects limit/offset params', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${URL}?limit=10&offset=5`).set(AUTH);
    expect(res.status).toBe(200);
    // Verify params were passed
    const params = db.query.mock.calls[0][1];
    expect(params).toContain(10);
    expect(params).toContain(5);
  });

  test('401 — no auth', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /v1/reports/metrics
// ─────────────────────────────────────────────
describe('GET /v1/reports/metrics', () => {
  const URL = '/v1/reports/metrics';

  test('200 — returns metrics', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ metric_date: '2026-01-01', total_users: 100 }] });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('200 — accepts date range filter', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`${URL}?start=2026-01-01&end=2026-01-31`).set(AUTH);
    expect(res.status).toBe(200);
  });

  test('401 — no auth', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// POST /v1/reports/generate
// ─────────────────────────────────────────────
describe('POST /v1/reports/generate', () => {
  const URL = '/v1/reports/generate';

  test('200 — generates report', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ trade_count: '5', total_volume: '1000' }] })
      .mockResolvedValueOnce({ rows: [{ payment_count: '2', total_paid: '59.98' }] })
      .mockResolvedValueOnce({ rows: [] }); // event log

    const res = await request(app).post(URL).set(AUTH).send({ start_date: '2026-01-01', end_date: '2026-01-31' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('report');
    expect(res.body.report.period.start_date).toBe('2026-01-01');
  });

  test('400 — missing start_date', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ end_date: '2026-01-31' });
    expect(res.status).toBe(400);
  });

  test('400 — missing end_date', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ start_date: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  test('400 — empty body', async () => {
    const res = await request(app).post(URL).set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('401 — no auth', async () => {
    const res = await request(app).post(URL).send({ start_date: '2026-01-01', end_date: '2026-01-31' });
    expect(res.status).toBe(401);
  });
});
