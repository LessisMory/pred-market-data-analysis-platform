const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config/env');
const { syncFirebaseUser } = require('../services/firebaseAuthSync');
const { firebaseAdminEnabled } = require('../services/firebaseAdmin');

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

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function serializeUser(user) {
  if (!user) {
    return user;
  }

  const { firstName, lastName } = splitName(user.name);
  return {
    ...user,
    firstName,
    lastName,
    planName: user.plan || null,
  };
}

function buildAdminUser(username) {
  return {
    user_id: 0,
    email: `${username}@admin.local`,
    name: 'Platform Administrator',
    username,
    role: 'admin',
    status: 'active',
    plan: 'enterprise',
    firstName: 'Platform',
    lastName: 'Administrator',
    planName: 'enterprise',
  };
}

function isConfiguredAdminLogin(username, password) {
  return username === config.admin.username && password === config.admin.password;
}

function getFirebaseClientConfig() {
  return {
    apiKey: config.firebase.apiKey,
    authDomain: config.firebase.authDomain,
    projectId: config.firebase.projectId,
    storageBucket: config.firebase.storageBucket,
    messagingSenderId: config.firebase.messagingSenderId,
    appId: config.firebase.appId,
    measurementId: config.firebase.measurementId,
  };
}

function firebaseClientConfigured() {
  return Boolean(
    config.firebase.apiKey &&
      config.firebase.authDomain &&
      config.firebase.projectId &&
      config.firebase.appId
  );
}

function firebaseClientEnabled() {
  if (!firebaseClientConfigured()) {
    return false;
  }

  return !config.isProd || firebaseAdminEnabled();
}

// ─── Frontend required endpoints ────────────────────────────

exports.getClientConfig = (_req, res) => {
  const enabled = firebaseClientEnabled();

  return res.json({
    enabled,
    firebase: getFirebaseClientConfig(),
    providers: {
      google: enabled,
    },
  });
};

exports.exchangeFirebaseSession = async (req, res, next) => {
  const idToken = req.body.idToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  try {
    const user = await syncFirebaseUser({
      idToken,
      overrides: {
        email: req.body.email,
        phone: req.body.phone,
        name: req.body.name,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
      },
    });

    return res.json({
      token: idToken,
      user,
    });
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/register
exports.register = async (req, res, next) => {
  const { email, password, name, firstName, lastName } = req.body;
  const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ').trim();

  if (!email || !password || !resolvedName) {
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
      [email, passwordHash, resolvedName]
    );

    const user = serializeUser(result.rows[0]);
    const token = generateJwt({ user_id: user.user_id, email: user.email, role: user.role });

    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

    return res.status(201).json({
      token,
      user,
      mfa_required: false,
      admin_access: user.role === 'admin',
    });
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/login  → verify credentials and return JWT + user info
exports.login = async (req, res, next) => {
  const { email, username, password } = req.body;
  if ((!email && !username) || !password) {
    return res.status(400).json({ error: 'email or username and password are required' });
  }

  if (username && isConfiguredAdminLogin(username, password)) {
    const user = buildAdminUser(username);
    const token = generateJwt({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      username,
      is_admin_session: true,
    });

    return res.json({
      token,
      user,
      mfa_required: false,
      admin_access: true,
    });
  }

  if (username && !email) {
    return res.status(401).json({ error: 'Invalid admin username or password' });
  }

  if (!email) {
    return res.status(400).json({ error: 'email is required for non-admin login' });
  }

  try {
    const result = await db.query(
      'SELECT user_id, email, name, password_hash, role, status FROM users WHERE email = $1',
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

    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);
    const serializedUser = serializeUser(user);
    const token = generateJwt({
      user_id: serializedUser.user_id,
      email: serializedUser.email,
      role: serializedUser.role,
    });

    return res.json({
      token,
      user: serializedUser,
      mfa_required: false,
      admin_access: serializedUser.role === 'admin',
    });
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

  if (req.user.firebase_uid) {
    return res.json(serializeUser(req.user));
  }

  if (req.user.role === 'admin' && req.user.is_admin_session) {
    return res.json(buildAdminUser(req.user.username || config.admin.username));
  }

  try {
    const result = await db.query(
      'SELECT user_id, email, name, role, status, plan FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json(serializeUser(result.rows[0]));
  } catch (err) {
    return next(err);
  }
};

// POST /v1/auth/logout  — requires Authorization: Bearer <token>
exports.logout = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.firebase_uid) {
    return res.json({ message: 'Logged out' });
  }

  if (req.user.role === 'admin' && req.user.is_admin_session) {
    return res.json({ message: 'Logged out' });
  }

  try {
    // Clear any OAuth sessions for this user
    await db.query('DELETE FROM user_session WHERE user_id = $1', [req.user.user_id]);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
};
