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

const ADMIN_TOKEN = makeToken({
  user_id: 99,
  email: 'admin@admin.local',
  role: 'admin',
  username: 'admin',
  is_admin_session: true,
});

const USER_TOKEN = makeToken({ user_id: 1, email: 'user@test.com', role: 'user' });

beforeEach(() => {
  jest.clearAllMocks();
  db.query.mockResolvedValue({ rows: [] });
});

// ─────────────────────────────────────────────
// GET /v1/admin/users
// ─────────────────────────────────────────────
describe('GET /v1/admin/users', () => {
  const URL = '/v1/admin/users';

  test('200 — admin can list users with summary', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          user_id: 2, name: 'Alice', email: 'alice@test.com', phone: '+15555550123',
          role: 'user', status: 'active', plan: 'pro',
          created_at: '2026-01-01', last_login: '2026-04-01', total_trades: 12,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_users: 1, admin_users: 0, active_users: 1, disabled_users: 0 }],
      });

    const res = await request(app).get(URL).set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.summary.total_users).toBe(1);
    expect(res.body.pagination).toBeDefined();
  });

  test('200 — empty user list', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ total_users: 0, admin_users: 0, active_users: 0, disabled_users: 0 }],
      });

    const res = await request(app).get(URL).set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(0);
  });

  test('200 — search query param is forwarded', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ total_users: 0, admin_users: 0, active_users: 0, disabled_users: 0 }],
      });

    const res = await request(app)
      .get(`${URL}?search=alice`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.search).toBe('alice');
  });

  test('403 — regular user is blocked', async () => {
    const res = await request(app).get(URL).set('Authorization', `Bearer ${USER_TOKEN}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin access required/i);
  });

  test('401 — missing token', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// POST /v1/admin/users
// ─────────────────────────────────────────────
describe('POST /v1/admin/users', () => {
  const URL = '/v1/admin/users';

  test('201 — creates new user', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 10, name: 'New User', email: 'new@test.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-04-01', last_login: null }],
      });

    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'New User', email: 'new@test.com', password: 'securePass1!' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@test.com');
  });

  test('400 — missing required fields', async () => {
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'X' });

    expect(res.status).toBe(400);
  });

  test('400 — invalid email format', async () => {
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'X', email: 'bad-email', password: 'securePass1!' });

    expect(res.status).toBe(400);
  });

  test('400 — password too short', async () => {
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'X', email: 'x@test.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  test('409 — duplicate email', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 5 }],
    });

    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'X', email: 'existing@test.com', password: 'securePass1!' });

    expect(res.status).toBe(409);
  });

  test('403 — non-admin cannot create users', async () => {
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ name: 'X', email: 'x@test.com', password: 'securePass1!' });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// PATCH /v1/admin/users/:id/status
// ─────────────────────────────────────────────
describe('PATCH /v1/admin/users/:id/status', () => {
  test('200 — disable active user', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 2, name: 'Alice', email: 'alice@test.com', role: 'user', status: 'disabled', plan: 'pro' }],
    });

    const res = await request(app)
      .patch('/v1/admin/users/2/status')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'disabled' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('disabled');
  });

  test('200 — re-enable disabled user', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 2, name: 'Alice', email: 'alice@test.com', role: 'user', status: 'active', plan: 'pro' }],
    });

    const res = await request(app)
      .patch('/v1/admin/users/2/status')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('active');
  });

  test('400 — invalid status value', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/2/status')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'suspended' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/active.*disabled/i);
  });

  test('400 — non-integer user id', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/abc/status')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'active' });

    expect(res.status).toBe(400);
  });

  test('404 — user does not exist', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/999/status')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'disabled' });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// PATCH /v1/admin/users/:id/role
// ─────────────────────────────────────────────
describe('PATCH /v1/admin/users/:id/role', () => {
  test('200 — promote user to admin', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 2, name: 'Alice', email: 'alice@test.com', phone: null, role: 'admin', status: 'active', plan: 'pro', created_at: '2026-01-01', last_login: null }],
    });

    const res = await request(app)
      .patch('/v1/admin/users/2/role')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  test('404 — user does not exist', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/999/role')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(404);
  });

  test('400 — non-integer user id', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/abc/role')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// POST /v1/admin/users/:id/reset-password
// ─────────────────────────────────────────────
describe('POST /v1/admin/users/:id/reset-password', () => {
  test('200 — generates reset token', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 2, email: 'alice@test.com', name: 'Alice' }],
    });

    const res = await request(app)
      .post('/v1/admin/users/2/reset-password')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.reset_requested).toBe(true);
    expect(res.body.expires_at).toBeDefined();
  });

  test('404 — user does not exist', async () => {
    const res = await request(app)
      .post('/v1/admin/users/999/reset-password')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(404);
  });

  test('400 — non-integer user id', async () => {
    const res = await request(app)
      .post('/v1/admin/users/abc/reset-password')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// DELETE /v1/admin/users/:id
// ─────────────────────────────────────────────
describe('DELETE /v1/admin/users/:id', () => {
  test('200 — deletes user', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 2, name: 'Alice', email: 'alice@test.com', role: 'user', status: 'active', plan: 'pro' }],
    });

    const res = await request(app)
      .delete('/v1/admin/users/2')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@test.com');
  });

  test('400 — admin cannot delete own account', async () => {
    const res = await request(app)
      .delete('/v1/admin/users/99')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot delete your own/i);
  });

  test('404 — user does not exist', async () => {
    const res = await request(app)
      .delete('/v1/admin/users/999')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(404);
  });

  test('400 — non-integer user id', async () => {
    const res = await request(app)
      .delete('/v1/admin/users/abc')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(400);
  });

  test('403 — non-admin cannot delete', async () => {
    const res = await request(app)
      .delete('/v1/admin/users/2')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /v1/admin/transactions
// ─────────────────────────────────────────────
describe('GET /v1/admin/transactions', () => {
  test('200 — returns transaction list', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ payment_id: 1, user_id: 2, amount: 29.99, status: 'completed', created_at: '2026-04-01' }],
    });

    const res = await request(app)
      .get('/v1/admin/transactions')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('403 — regular user blocked', async () => {
    const res = await request(app)
      .get('/v1/admin/transactions')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /v1/admin/platform
// ─────────────────────────────────────────────
describe('GET /v1/admin/platform', () => {
  test('200 — returns platform overview', async () => {
    const res = await request(app)
      .get('/v1/admin/platform')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
  });

  test('403 — regular user blocked', async () => {
    const res = await request(app)
      .get('/v1/admin/platform')
      .set('Authorization', `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });
});
