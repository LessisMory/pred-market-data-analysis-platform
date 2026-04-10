const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the db module before requiring app
jest.mock('../db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn(), end: jest.fn() },
}));

const db = require('../db');
const { app } = require('../app');

const crypto = require('crypto');
function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-change-me', {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────
// POST /v1/auth/register
// ─────────────────────────────────────────────
describe('POST /v1/auth/register', () => {
  const URL = '/v1/auth/register';

  test('201 — successful registration', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, email: 'a@b.com', name: 'Test', role: 'user', status: 'active', plan: 'free', created_at: new Date().toISOString() }],
      });

    const res = await request(app).post(URL).send({ email: 'a@b.com', password: 'pass123', name: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty('user_id');
    expect(res.body.user.email).toBe('a@b.com');
  });

  test('400 — missing email', async () => {
    const res = await request(app).post(URL).send({ password: 'pass123', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('400 — missing password', async () => {
    const res = await request(app).post(URL).send({ email: 'a@b.com', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test('400 — missing name', async () => {
    const res = await request(app).post(URL).send({ email: 'a@b.com', password: 'pass123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('400 — empty body', async () => {
    const res = await request(app).post(URL).send({});
    expect(res.status).toBe(400);
  });

  test('409 — duplicate email', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // existing user

    const res = await request(app).post(URL).send({ email: 'a@b.com', password: 'pass123', name: 'Test' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('500 — database error bubbles up', async () => {
    db.query.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app).post(URL).send({ email: 'a@b.com', password: 'pass123', name: 'Test' });
    expect(res.status).toBe(500);
  });

  test('ignores extra fields in body', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 2, email: 'b@c.com', name: 'X', role: 'user', status: 'active', plan: 'free', created_at: new Date().toISOString() }],
      });

    const res = await request(app).post(URL).send({ email: 'b@c.com', password: 'pass123', name: 'X', admin: true, role: 'admin' });
    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────
// POST /v1/auth/login
// ─────────────────────────────────────────────
describe('POST /v1/auth/login', () => {
  const URL = '/v1/auth/login';

  // Pre-compute a known password hash
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync('correct-password', salt, 64).toString('hex');
  const storedHash = `${salt}:${hash}`;

  test('200 — valid credentials trigger MFA', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, password_hash: storedHash, status: 'active' }],
    });

    const res = await request(app).post(URL).send({ email: 'a@b.com', password: 'correct-password' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user_id: 1, mfa_required: true });
  });

  test('400 — missing email', async () => {
    const res = await request(app).post(URL).send({ password: 'abc' });
    expect(res.status).toBe(400);
  });

  test('400 — missing password', async () => {
    const res = await request(app).post(URL).send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('401 — user not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post(URL).send({ email: 'no@user.com', password: 'abc' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('401 — wrong password', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, password_hash: storedHash, status: 'active' }],
    });

    const res = await request(app).post(URL).send({ email: 'a@b.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('403 — disabled account', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, password_hash: storedHash, status: 'disabled' }],
    });

    const res = await request(app).post(URL).send({ email: 'a@b.com', password: 'correct-password' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/disabled/i);
  });
});

// ─────────────────────────────────────────────
// POST /v1/auth/send-sms
// ─────────────────────────────────────────────
describe('POST /v1/auth/send-sms', () => {
  const URL = '/v1/auth/send-sms';

  test('200 — sends code successfully', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // INSERT mfa_code

    const res = await request(app).post(URL).send({ user_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('expires_in', 300);
  });

  test('400 — missing user_id', async () => {
    const res = await request(app).post(URL).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user_id/i);
  });

  test('400 — null user_id', async () => {
    const res = await request(app).post(URL).send({ user_id: null });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// POST /v1/auth/verify-mfa
// ─────────────────────────────────────────────
describe('POST /v1/auth/verify-mfa', () => {
  const URL = '/v1/auth/verify-mfa';

  test('200 — valid code returns JWT', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10, expires_at: new Date(Date.now() + 60000) }] }) // valid code
      .mockResolvedValueOnce({ rows: [] }) // mark used
      .mockResolvedValueOnce({ rows: [] }) // update last_login
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, email: 'a@b.com', name: 'Test', role: 'user', status: 'active', plan: 'free' }],
      });

    const res = await request(app).post(URL).send({ user_id: 1, code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('a@b.com');
  });

  test('400 — missing user_id', async () => {
    const res = await request(app).post(URL).send({ code: '123456' });
    expect(res.status).toBe(400);
  });

  test('400 — missing code', async () => {
    const res = await request(app).post(URL).send({ user_id: 1 });
    expect(res.status).toBe(400);
  });

  test('401 — invalid code', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // no matching code

    const res = await request(app).post(URL).send({ user_id: 1, code: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('401 — expired code', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 10, expires_at: new Date(Date.now() - 60000) }], // expired
    });

    const res = await request(app).post(URL).send({ user_id: 1, code: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });
});

// ─────────────────────────────────────────────
// GET /v1/auth/me (protected)
// ─────────────────────────────────────────────
describe('GET /v1/auth/me', () => {
  const URL = '/v1/auth/me';

  test('200 — returns user info with valid JWT', async () => {
    const token = makeToken({ user_id: 1, email: 'a@b.com', role: 'user' });
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, email: 'a@b.com', name: 'Test', role: 'user', status: 'active', plan: 'free' }],
    });

    const res = await request(app).get(URL).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.com');
  });

  test('401 — no token', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  test('401 — malformed token', async () => {
    const res = await request(app).get(URL).set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });

  test('401 — tampered signature', async () => {
    const token = makeToken({ user_id: 1, email: 'a@b.com', role: 'user' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    const res = await request(app).get(URL).set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  test('401 — expired token', async () => {
    const expired = jwt.sign(
      { user_id: 1, email: 'a@b.com', role: 'user' },
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { algorithm: 'HS256', expiresIn: '-1s' }
    );
    const res = await request(app).get(URL).set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  test('401 — token signed with wrong secret', async () => {
    const badToken = jwt.sign(
      { user_id: 1, email: 'a@b.com', role: 'user' },
      'wrong-secret',
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const res = await request(app).get(URL).set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  test('401 — Bearer prefix missing', async () => {
    const token = makeToken({ user_id: 1, email: 'a@b.com', role: 'user' });
    const res = await request(app).get(URL).set('Authorization', token);
    expect(res.status).toBe(401);
  });
});
