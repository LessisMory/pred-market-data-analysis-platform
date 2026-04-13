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

beforeEach(() => {
  jest.clearAllMocks();
  db.query.mockResolvedValue({ rows: [] });
});

describe('/v1 cross-route integration', () => {
  test('GET /v1/user/profile returns serialized profile', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'Test User', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', last_login: null, auth_provider: 'password' }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_trades: 3, total_volume: 500, last_active: '2026-01-01' }],
      });

    const res = await request(app).get('/v1/user/profile').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Test');
    expect(res.body.planName).toBe('free');
    expect(res.body.authProvider).toBe('password');
  });

  test('GET /health does not require auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/nonexistent').set(AUTH);
    expect(res.status).toBe(404);
  });
});
