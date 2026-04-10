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
// GET /v1/user/profile
// ─────────────────────────────────────────────
describe('GET /v1/user/profile', () => {
  const URL = '/v1/user/profile';

  test('200 — returns profile with stats', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'Test', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', last_login: null }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_trades: 3, total_volume: 500, last_active: '2026-01-01' }],
      });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.email).toBe('a@b.com');
  });

  test('404 — user not found (deleted between JWT issue and request)', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(404);
  });

  test('401 — no auth', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /v1/user/activities
// ─────────────────────────────────────────────
describe('GET /v1/user/activities', () => {
  const URL = '/v1/user/activities';

  test('200 — returns activity array', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ activity_id: 1, activity_type: 'order_buy', created_at: '2026-01-01' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('200 — empty for new user', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('401 — no auth', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// PUT /v1/user/update
// ─────────────────────────────────────────────
describe('PUT /v1/user/update', () => {
  const URL = '/v1/user/update';

  test('200 — update name only', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'NewName', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free' }],
      })
      .mockResolvedValueOnce({ rows: [] }); // activity log

    const res = await request(app).put(URL).set(AUTH).send({ name: 'NewName' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('NewName');
  });

  test('200 — update multiple fields', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'X', email: 'new@b.com', phone: '+1234', role: 'user', status: 'active', plan: 'free' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put(URL).set(AUTH).send({ name: 'X', email: 'new@b.com', phone: '+1234' });
    expect(res.status).toBe(200);
  });

  test('400 — empty body (no fields)', async () => {
    const res = await request(app).put(URL).set(AUTH).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one/i);
  });

  test('400 — only irrelevant fields', async () => {
    const res = await request(app).put(URL).set(AUTH).send({ role: 'admin', plan: 'institutional' });
    expect(res.status).toBe(400);
  });

  test('401 — no auth', async () => {
    const res = await request(app).put(URL).send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  test('500 — database error', async () => {
    db.query.mockRejectedValueOnce(new Error('unique violation'));

    const res = await request(app).put(URL).set(AUTH).send({ email: 'dup@test.com' });
    expect(res.status).toBe(500);
  });
});
