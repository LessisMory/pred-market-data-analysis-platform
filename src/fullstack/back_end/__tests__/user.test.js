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

// ─────────────────────────────────────────────
// GET /v1/user/profile
// ─────────────────────────────────────────────
describe('GET /v1/user/profile', () => {
  const URL = '/v1/user/profile';

  test('200 — returns profile with stats', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'Test User', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', last_login: null, auth_provider: 'password' }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_trades: 3, total_volume: 500, last_active: '2026-01-01' }],
      });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.email).toBe('a@b.com');
    expect(res.body.firstName).toBe('Test');
    expect(res.body.lastName).toBe('User');
  });

  test('200 — user with no stats returns zero defaults', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'Solo', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', last_login: null, auth_provider: 'password' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.stats.total_trades).toBe(0);
    expect(res.body.stats.total_volume).toBe(0);
  });

  test('200 — user with unicode name is split correctly', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'José García', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'pro', created_at: '2026-01-01', last_login: null, auth_provider: 'password' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('José');
    expect(res.body.lastName).toBe('García');
  });

  test('200 — user with single-word name has empty lastName', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'Mononym', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', last_login: null, auth_provider: 'password' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Mononym');
    expect(res.body.lastName).toBe('');
  });

  test('200 — includes memberSince formatted from created_at', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-03-15', last_login: null, auth_provider: 'password' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.memberSince).toMatch(/Mar\s+2026/);
  });

  test('200 — includes default notification preferences when profile row is empty', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', last_login: null, auth_provider: 'password' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.preferences.notifications).toMatchObject({
      marketAlerts: true,
      securityAlerts: true,
    });
  });

  test('404 — user not found (deleted between JWT issue and request)', async () => {
    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(404);
  });

  test('401 — no auth header', async () => {
    const res = await request(app).get(URL);
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
  });

  test('401 — malformed token', async () => {
    const res = await request(app).get(URL).set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /v1/user/me
// ─────────────────────────────────────────────
describe('GET /v1/user/me', () => {
  const URL = '/v1/user/me';

  test('200 — returns lightweight identity payload', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'Test User', email: 'a@b.com', role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', auth_provider: 'password' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Test');
    expect(res.body.planName).toBe('free');
  });

  test('200 — multi-word last name is preserved', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'Mary Jane Watson-Parker', email: 'a@b.com', role: 'user', status: 'active', plan: 'pro', created_at: '2026-01-01', auth_provider: 'password' }],
    });

    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Mary');
    expect(res.body.lastName).toBe('Jane Watson-Parker');
  });

  test('404 — deleted user', async () => {
    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(404);
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
    expect(res.body).toHaveLength(1);
  });

  test('200 — empty for new user', async () => {
    const res = await request(app).get(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('200 — respects limit query param', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ activity_id: 1, activity_type: 'login', created_at: '2026-01-01' }],
    });

    const res = await request(app).get(`${URL}?limit=1&offset=0`).set(AUTH);
    expect(res.status).toBe(200);
    const queryArgs = db.query.mock.calls[0];
    expect(queryArgs[1]).toContain(1);
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
        rows: [{ user_id: 1, name: 'OldName' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'NewName', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', auth_provider: 'password' }],
      });

    const res = await request(app).put(URL).set(AUTH).send({ name: 'NewName' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('NewName');
  });

  test('200 — update via firstName + lastName fields', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'Old Name' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'Jane Doe', email: 'a@b.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', auth_provider: 'password' }],
      });

    const res = await request(app).put(URL).set(AUTH).send({ firstName: 'Jane', lastName: 'Doe' });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Jane');
    expect(res.body.lastName).toBe('Doe');
  });

  test('200 — update email and phone together', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'X' }],
      })
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'X', email: 'new@b.com', phone: '+1234', role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', auth_provider: 'password' }],
      });

    const res = await request(app).put(URL).set(AUTH).send({ name: 'X', email: 'new@b.com', phone: '+1234' });
    expect(res.status).toBe(200);
  });

  test('400 — empty body (no fields)', async () => {
    const res = await request(app).put(URL).set(AUTH).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one/i);
  });

  test('400 — only non-updatable fields', async () => {
    const res = await request(app).put(URL).set(AUTH).send({ role: 'admin', plan: 'institutional' });
    expect(res.status).toBe(400);
  });

  test('409 — duplicate email triggers unique constraint', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'X' }],
      })
      .mockRejectedValueOnce(Object.assign(new Error('unique violation'), { code: '23505' }));

    const res = await request(app).put(URL).set(AUTH).send({ email: 'dup@test.com' });
    expect(res.status).toBe(409);
  });

  test('500 — unexpected database error', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, name: 'X' }],
      })
      .mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app).put(URL).set(AUTH).send({ name: 'Y' });
    expect(res.status).toBe(500);
  });

  test('401 — no auth', async () => {
    const res = await request(app).put(URL).send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// PUT /v1/user/email
// ─────────────────────────────────────────────
describe('PUT /v1/user/email', () => {
  const URL = '/v1/user/email';

  test('200 — updates email', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X', email: 'new@test.com', phone: null, role: 'user', status: 'active', plan: 'free', created_at: '2026-01-01', auth_provider: 'password' }],
    });

    const res = await request(app).put(URL).set(AUTH).send({ email: 'new@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email updated');
  });

  test('400 — missing email', async () => {
    const res = await request(app).put(URL).set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('400 — invalid email format', async () => {
    const res = await request(app).put(URL).set(AUTH).send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('400 — empty string email', async () => {
    const res = await request(app).put(URL).set(AUTH).send({ email: '' });
    expect(res.status).toBe(400);
  });

  test('409 — duplicate email', async () => {
    db.query.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: '23505' }));

    const res = await request(app).put(URL).set(AUTH).send({ email: 'taken@test.com' });
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────
// PUT /v1/user/password
// ─────────────────────────────────────────────
describe('PUT /v1/user/password', () => {
  const URL = '/v1/user/password';

  test('200 — updates password', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, password_hash: null, auth_provider: 'google.com' }],
    });

    const res = await request(app).put(URL).set(AUTH).send({
      currentPassword: '',
      newPassword: 'newSecure123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated');
  });

  test('400 — new password too short', async () => {
    const res = await request(app).put(URL).set(AUTH).send({
      currentPassword: 'old',
      newPassword: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  test('400 — wrong current password for password-based account', async () => {
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('correctPassword', salt, 64).toString('hex');

    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, password_hash: `${salt}:${hash}`, auth_provider: 'password' }],
    });

    const res = await request(app).put(URL).set(AUTH).send({
      currentPassword: 'wrongPassword',
      newPassword: 'newSecure123!',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  test('404 — user not found', async () => {
    const res = await request(app).put(URL).set(AUTH).send({
      currentPassword: 'old',
      newPassword: 'newSecure123!',
    });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// PUT /v1/user/preferences
// ─────────────────────────────────────────────
describe('PUT /v1/user/preferences', () => {
  const URL = '/v1/user/preferences';

  test('200 — updates notification preferences', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X' }],
    });

    const res = await request(app).put(URL).set(AUTH).send({
      notifications: { marketAlerts: false, productUpdates: true },
    });
    expect(res.status).toBe(200);
    expect(res.body.preferences.notifications.marketAlerts).toBe(false);
    expect(res.body.preferences.notifications.productUpdates).toBe(true);
  });

  test('200 — empty notifications body merges with defaults', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X' }],
    });

    const res = await request(app).put(URL).set(AUTH).send({ notifications: {} });
    expect(res.status).toBe(200);
    expect(res.body.preferences.notifications.securityAlerts).toBe(true);
  });

  test('404 — user not found', async () => {
    const res = await request(app).put(URL).set(AUTH).send({
      notifications: { marketAlerts: false },
    });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// POST /v1/user/api-keys
// ─────────────────────────────────────────────
describe('POST /v1/user/api-keys', () => {
  const URL = '/v1/user/api-keys';

  test('201 — creates API key with raw key in response', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X' }],
    });

    const res = await request(app).post(URL).set(AUTH).send({ label: 'My Key' });
    expect(res.status).toBe(201);
    expect(res.body.apiKey.rawKey).toMatch(/^pmdp_/);
    expect(res.body.apiKey.label).toBe('My Key');
    expect(res.body.apiKey.status).toBe('active');
  });

  test('201 — defaults label when empty', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X' }],
    });

    const res = await request(app).post(URL).set(AUTH).send({});
    expect(res.status).toBe(201);
    expect(res.body.apiKey.label).toBe('API Key');
  });

  test('201 — truncates very long label to 60 chars', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X' }],
    });

    const res = await request(app).post(URL).set(AUTH).send({ label: 'A'.repeat(100) });
    expect(res.status).toBe(201);
    expect(res.body.apiKey.label.length).toBeLessThanOrEqual(60);
  });

  test('404 — user not found', async () => {
    const res = await request(app).post(URL).set(AUTH).send({ label: 'Key' });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// DELETE /v1/user/api-keys/:id
// ─────────────────────────────────────────────
describe('DELETE /v1/user/api-keys/:id', () => {
  test('200 — revokes existing key', async () => {
    const keyId = 'test-key-id';
    const profileWithKey = {
      profile_id: 1,
      first_name: 'X',
      last_name: '',
      preferences_json: {
        notifications: {},
        api_keys: [{ id: keyId, label: 'Test', masked_key: 'pmdp_xxx...1234', key_hash: 'abc', created_at: '2026-01-01', revoked_at: null }],
      },
    };

    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1, name: 'X' }] })
      .mockResolvedValue({ rows: [profileWithKey] });

    const res = await request(app).delete(`/v1/user/api-keys/${keyId}`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('API key revoked');
  });

  test('404 — key id not found', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, name: 'X' }],
    });

    const res = await request(app).delete('/v1/user/api-keys/nonexistent').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('400 — empty key id', async () => {
    const res = await request(app).delete('/v1/user/api-keys/').set(AUTH);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// DELETE /v1/user/deactivate
// ─────────────────────────────────────────────
describe('DELETE /v1/user/deactivate', () => {
  const URL = '/v1/user/deactivate';

  test('200 — disables account and clears sessions', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 1, status: 'disabled' }],
    });

    const res = await request(app).delete(URL).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('disabled');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM user_session'),
      [1]
    );
  });

  test('404 — user already deleted', async () => {
    const res = await request(app).delete(URL).set(AUTH);
    expect(res.status).toBe(404);
  });

  test('401 — no auth', async () => {
    const res = await request(app).delete(URL);
    expect(res.status).toBe(401);
  });
});
