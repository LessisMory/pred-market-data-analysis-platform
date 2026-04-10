const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config/env');

// ─── Helpers ────────────────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

function generateJwt(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.expiresIn,
  });
}

function generateMfaCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Frontend required endpoints ────────────────────────────

// POST /v1/auth/register
exports.register = async (req, res, next) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  try {
    const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING user_id, email, name, role, status, plan, created_at`,
      [email, passwordHash, name]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/login  → verify email/password, return user_id for 2FA step
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await db.query(
      'SELECT user_id, password_hash, status FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Account is disabled' });
    }
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Password verified – frontend should call /send-sms next
    return res.json({ user_id: user.user_id, mfa_required: true });
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/send-sms  → generate 6-digit code and send via SMS
exports.sendSms = async (req, res, next) => {
  const { user_id, phone } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const code = generateMfaCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.query(
      `INSERT INTO mfa_code (user_id, code, expires_at) VALUES ($1, $2, $3)`,
      [user_id, code, expiresAt]
    );

    // TODO: integrate AWS SNS / Twilio here
    // await snsClient.publish({ PhoneNumber: phone, Message: `Your code: ${code}` });
    console.log(`[MFA] Code for user ${user_id}: ${code}`); // dev only

    return res.json({ message: 'Verification code sent', expires_in: 300 });
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/verify-mfa  → validate SMS code, return JWT + user info
exports.verifyMfa = async (req, res, next) => {
  const { user_id, code } = req.body;
  if (!user_id || !code) {
    return res.status(400).json({ error: 'user_id and code are required' });
  }

  try {
    const result = await db.query(
      `SELECT id, expires_at FROM mfa_code
       WHERE user_id = $1 AND code = $2 AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [user_id, code]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    const mfa = result.rows[0];
    if (new Date(mfa.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Verification code expired' });
    }

    // Mark code as used and update last_login
    await db.query('UPDATE mfa_code SET used = TRUE WHERE id = $1', [mfa.id]);
    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user_id]);

    // Fetch user info
    const userResult = await db.query(
      'SELECT user_id, email, name, role, status, plan FROM users WHERE user_id = $1',
      [user_id]
    );
    const user = userResult.rows[0];

    // Generate JWT
    const token = generateJwt({ user_id: user.user_id, email: user.email, role: user.role });

    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
};

// ─── Phone Login ────────────────────────────────────────────

// POST /v1/auth/phone/send-code  → send SMS code to phone number (auto-creates user if needed)
exports.phoneSendCode = async (req, res, next) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  try {
    // Upsert user by phone number
    const upsertResult = await db.query(
      `INSERT INTO users (phone, email, password_hash, name)
       VALUES ($1, $1, 'phone', $1)
       ON CONFLICT (phone) DO UPDATE SET last_login = NOW()
       RETURNING user_id`,
      [phone]
    );
    const userId = upsertResult.rows[0].user_id;

    const code = generateMfaCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      'INSERT INTO mfa_code (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [userId, code, expiresAt]
    );

    // TODO: integrate AWS SNS / Twilio here
    console.log(`[PHONE] Code for ${phone}: ${code}`); // dev only

    return res.json({ user_id: userId, message: 'Verification code sent', expires_in: 300 });
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/phone/verify  → verify SMS code, return JWT + user info
exports.phoneVerify = async (req, res, next) => {
  const { user_id, code } = req.body;
  if (!user_id || !code) {
    return res.status(400).json({ error: 'user_id and code are required' });
  }

  try {
    const result = await db.query(
      `SELECT id, expires_at FROM mfa_code
       WHERE user_id = $1 AND code = $2 AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [user_id, code]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    const mfa = result.rows[0];
    if (new Date(mfa.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Verification code expired' });
    }

    await db.query('UPDATE mfa_code SET used = TRUE WHERE id = $1', [mfa.id]);
    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user_id]);

    const userResult = await db.query(
      'SELECT user_id, email, name, role, status, plan, phone FROM users WHERE user_id = $1',
      [user_id]
    );
    const user = userResult.rows[0];

    const token = generateJwt({ user_id: user.user_id, email: user.email, role: user.role });

    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
};

// ─── OAuth ──────────────────────────────────────────────────

const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scopes: 'openid email profile',
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scopes: 'read:user user:email',
  },
};

const REDIRECT_BASE = process.env.OAUTH_REDIRECT_BASE || 'http://localhost:3000';

// GET /v1/auth/oauth/:provider
exports.getOAuthUrl = (req, res) => {
  const { provider } = req.params;
  const config = PROVIDERS[provider];
  if (!config) {
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }

  const redirectUri = `${REDIRECT_BASE}/v1/auth/oauth/${provider}/callback`;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes,
  });

  return res.json({ url: `${config.authorizeUrl}?${params.toString()}` });
};

// GET /v1/auth/oauth/:provider/callback
exports.oauthCallback = async (req, res, next) => {
  const { provider } = req.params;
  const { code } = req.query;
  const config = PROVIDERS[provider];

  if (!config) {
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const redirectUri = `${REDIRECT_BASE}/v1/auth/oauth/${provider}/callback`;

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Failed to obtain access token' });
    }

    const userInfoRes = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    const email = userInfo.email;
    const username = userInfo.name || userInfo.login || email.split('@')[0];

    // Upsert user
    const upsertUser = await db.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'oauth', $2)
       ON CONFLICT (email) DO UPDATE SET last_login = NOW()
       RETURNING user_id, email, name, role, status, plan`,
      [email, username]
    );
    const user = upsertUser.rows[0];

    // Create session
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    await db.query(
      `INSERT INTO user_session (user_id, oauth_provider, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.user_id, provider, tokenData.access_token, tokenData.refresh_token || null, expiresAt]
    );

    // Generate JWT same as normal login
    const token = generateJwt({ user_id: user.user_id, email: user.email, role: user.role });

    const frontendRedirect = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendRedirect}/auth/callback?token=${token}`);
  } catch (err) {
    return next(err);
  }
};

// ─── Session (JWT-based) ────────────────────────────────────

// GET /v1/auth/me  — requires Authorization: Bearer <token>
exports.getMe = async (req, res, next) => {
  // req.user is set by authenticate middleware
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await db.query(
      'SELECT user_id, email, name, role, status, plan FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/logout  — requires Authorization: Bearer <token>
exports.logout = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Clear any OAuth sessions for this user
    await db.query('DELETE FROM user_session WHERE user_id = $1', [req.user.user_id]);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
};
