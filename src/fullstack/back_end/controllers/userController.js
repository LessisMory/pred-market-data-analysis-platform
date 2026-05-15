const crypto = require('crypto');
const db = require('../db');

const DEFAULT_NOTIFICATION_PREFERENCES = {
  marketAlerts: true,
  weeklyDigest: true,
  securityAlerts: true,
  productUpdates: false,
};

let userProfileSchemaEnsured = false;

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function formatMemberSince(date) {
  if (!date) {
    return null;
  }

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) {
    return false;
  }

  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

function buildDefaultPreferences() {
  return {
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    api_keys: [],
  };
}

function normalizeApiKeyEntry(entry = {}) {
  return {
    id: String(entry.id || ''),
    label: String(entry.label || 'API Key'),
    masked_key: String(entry.masked_key || entry.maskedKey || ''),
    key_hash: String(entry.key_hash || ''),
    created_at: entry.created_at || entry.createdAt || new Date().toISOString(),
    last_used_at: entry.last_used_at || entry.lastUsedAt || null,
    revoked_at: entry.revoked_at || entry.revokedAt || null,
  };
}

function normalizePreferences(raw = {}) {
  return {
    ...raw,
    notifications: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(raw.notifications || {}),
    },
    api_keys: Array.isArray(raw.api_keys) ? raw.api_keys.map(normalizeApiKeyEntry) : [],
  };
}

function serializeApiKey(entry = {}) {
  const normalized = normalizeApiKeyEntry(entry);
  return {
    id: normalized.id,
    label: normalized.label,
    maskedKey: normalized.masked_key,
    createdAt: normalized.created_at,
    lastUsedAt: normalized.last_used_at,
    revokedAt: normalized.revoked_at,
    status: normalized.revoked_at ? 'revoked' : 'active',
  };
}

async function ensureUserProfileSchema() {
  if (userProfileSchemaEnsured) {
    return;
  }

  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_user_id_unique ON user_profile(user_id)');
  userProfileSchemaEnsured = true;
}

async function ensureUserProfile(userId, name = '') {
  await ensureUserProfileSchema();
  const { firstName, lastName } = splitName(name);

  await db.query(
    `INSERT INTO user_profile (user_id, first_name, last_name, preferences_json)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, firstName || null, lastName || null, JSON.stringify(buildDefaultPreferences())]
  );
}

async function getUserProfileRow(userId, name = '') {
  await ensureUserProfile(userId, name);

  const result = await db.query(
    `SELECT profile_id, first_name, last_name, preferences_json
     FROM user_profile
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || {
    profile_id: null,
    first_name: '',
    last_name: '',
    preferences_json: buildDefaultPreferences(),
  };
}

async function saveUserProfileState(userId, payload = {}) {
  await ensureUserProfileSchema();

  const result = await db.query(
    `UPDATE user_profile
     SET first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         preferences_json = $4::jsonb
     WHERE user_id = $1
     RETURNING profile_id, first_name, last_name, preferences_json`,
    [
      userId,
      payload.firstName ?? null,
      payload.lastName ?? null,
      JSON.stringify(normalizePreferences(payload.preferences)),
    ]
  );

  return result.rows[0];
}

async function logUserActivity(userId, activityType) {
  await db.query(
    'INSERT INTO user_activity (user_id, activity_type) VALUES ($1, $2)',
    [userId, activityType]
  );
}

function serializeProfile(user, stats, profileRow = null) {
  const profileFirstName = String(profileRow?.first_name || '').trim();
  const profileLastName = String(profileRow?.last_name || '').trim();
  const resolvedName = [profileFirstName, profileLastName].filter(Boolean).join(' ').trim() || user.name;
  const { firstName, lastName } = resolvedName
    ? splitName(resolvedName)
    : splitName(user.name);
  const preferences = normalizePreferences(profileRow?.preferences_json || {});

  return {
    ...user,
    name: resolvedName,
    firstName,
    lastName,
    planName: user.plan,
    memberSince: formatMemberSince(user.created_at),
    stats,
    authProvider: user.auth_provider || 'password',
    preferences: {
      notifications: preferences.notifications,
    },
    apiKeys: preferences.api_keys.map(serializeApiKey),
  };
}

function buildFriendlyDbError(err, fallbackMessage) {
  if (err?.code === '23505') {
    return 'That value is already in use.';
  }

  return fallbackMessage;
}

// GET /v1/user/profile — get user profile + stats
exports.getProfile = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const userResult = await db.query(
      `SELECT
          user_id,
          name,
          email,
          phone,
          role,
          status,
          plan,
          created_at,
          last_login,
          auth_provider
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const [statsResult, profileRow] = await Promise.all([
      db.query(
        'SELECT total_trades, total_volume, last_active FROM user_stats WHERE user_id = $1',
        [userId]
      ),
      getUserProfileRow(userId, user.name),
    ]);

    const stats = statsResult.rows[0] || { total_trades: 0, total_volume: 0, last_active: null };

    return res.json(serializeProfile(user, stats, profileRow));
  } catch (err) {
    return next(err);
  }
};

// GET /v1/user/me — lightweight identity payload
exports.getMeSummary = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const result = await db.query(
      `SELECT user_id, name, email, role, status, plan, created_at, auth_provider
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const profileRow = await getUserProfileRow(userId, user.name);
    return res.json(serializeProfile(user, null, profileRow));
  } catch (err) {
    return next(err);
  }
};

// GET /v1/user/activities — get user activity timeline
exports.getActivities = async (req, res, next) => {
  const userId = req.user.user_id;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await db.query(
      `SELECT activity_id, activity_type, created_at
       FROM user_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
};

// PUT /v1/user/update — update user profile info
exports.updateProfile = async (req, res, next) => {
  const userId = req.user.user_id;
  const { name, email, phone, firstName, lastName } = req.body;
  const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ').trim();

  if (!resolvedName && !email && !phone) {
    return res.status(400).json({ error: 'At least one field (name, email, phone) is required' });
  }

  try {
    const existingUserResult = await db.query(
      'SELECT user_id, name FROM users WHERE user_id = $1',
      [userId]
    );

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (resolvedName) {
      fields.push(`name = $${idx++}`);
      values.push(resolvedName);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email);
    }
    if (phone) {
      fields.push(`phone = $${idx++}`);
      values.push(phone);
    }

    values.push(userId);

    const result = await db.query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE user_id = $${idx}
       RETURNING user_id, name, email, phone, role, status, plan, created_at, auth_provider`,
      values
    );

    const updatedUser = result.rows[0];
    const derivedNames = splitName(updatedUser.name || existingUserResult.rows[0].name);
    const existingProfileRow = await getUserProfileRow(userId, updatedUser.name);
    const profileRow = await saveUserProfileState(userId, {
      firstName: derivedNames.firstName || null,
      lastName: derivedNames.lastName || null,
      preferences: existingProfileRow.preferences_json || buildDefaultPreferences(),
    });

    await logUserActivity(userId, 'profile_update');
    return res.json(serializeProfile(updatedUser, null, profileRow));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email or phone number is already in use' });
    }
    return next(err);
  }
};

exports.updateEmail = async (req, res, next) => {
  const userId = req.user.user_id;
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET email = $1
       WHERE user_id = $2
       RETURNING user_id, name, email, phone, role, status, plan, created_at, auth_provider`,
      [email, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    const profileRow = await getUserProfileRow(userId, updatedUser.name);
    await logUserActivity(userId, 'email_update');

    return res.json({
      message: 'Email updated',
      user: serializeProfile(updatedUser, null, profileRow),
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email address is already in use' });
    }
    return next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  const userId = req.user.user_id;
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  try {
    const result = await db.query(
      `SELECT user_id, password_hash, auth_provider
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const requiresCurrentPassword =
      user.auth_provider === 'password' && user.password_hash && user.password_hash.includes(':');

    if (requiresCurrentPassword && !verifyPassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    await db.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [hashPassword(newPassword), userId]
    );

    await logUserActivity(userId, 'password_update');
    return res.json({ message: 'Password updated' });
  } catch (err) {
    return next(err);
  }
};

exports.updatePreferences = async (req, res, next) => {
  const userId = req.user.user_id;
  const incomingNotifications = req.body.notifications || {};

  try {
    const userResult = await db.query(
      'SELECT user_id, name FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profileRow = await getUserProfileRow(userId, userResult.rows[0].name);
    const preferences = normalizePreferences(profileRow.preferences_json || {});
    const updatedPreferences = normalizePreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        ...incomingNotifications,
      },
    });

    await saveUserProfileState(userId, {
      firstName: profileRow.first_name,
      lastName: profileRow.last_name,
      preferences: updatedPreferences,
    });

    await logUserActivity(userId, 'preferences_update');
    return res.json({
      message: 'Notification preferences updated',
      preferences: {
        notifications: updatedPreferences.notifications,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.createApiKey = async (req, res, next) => {
  const userId = req.user.user_id;
  const label = String(req.body.label || 'API Key').trim().slice(0, 60) || 'API Key';

  try {
    const userResult = await db.query(
      'SELECT user_id, name FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profileRow = await getUserProfileRow(userId, userResult.rows[0].name);
    const preferences = normalizePreferences(profileRow.preferences_json || {});
    const rawKey = `pmdp_${crypto.randomBytes(20).toString('hex')}`;
    const apiKeyEntry = normalizeApiKeyEntry({
      id: crypto.randomUUID(),
      label,
      masked_key: `${rawKey.slice(0, 9)}...${rawKey.slice(-4)}`,
      key_hash: crypto.createHash('sha256').update(rawKey).digest('hex'),
      created_at: new Date().toISOString(),
      revoked_at: null,
      last_used_at: null,
    });

    const updatedPreferences = normalizePreferences({
      ...preferences,
      api_keys: [apiKeyEntry, ...preferences.api_keys],
    });

    await saveUserProfileState(userId, {
      firstName: profileRow.first_name,
      lastName: profileRow.last_name,
      preferences: updatedPreferences,
    });

    await logUserActivity(userId, 'api_key_created');
    return res.status(201).json({
      message: 'API key created',
      apiKey: {
        ...serializeApiKey(apiKeyEntry),
        rawKey,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.revokeApiKey = async (req, res, next) => {
  const userId = req.user.user_id;
  const apiKeyId = String(req.params.id || '');

  if (!apiKeyId) {
    return res.status(400).json({ error: 'API key id is required' });
  }

  try {
    const userResult = await db.query(
      'SELECT user_id, name FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profileRow = await getUserProfileRow(userId, userResult.rows[0].name);
    const preferences = normalizePreferences(profileRow.preferences_json || {});
    const now = new Date().toISOString();
    let matched = false;

    const apiKeys = preferences.api_keys.map((entry) => {
      if (entry.id !== apiKeyId) {
        return entry;
      }

      matched = true;
      return normalizeApiKeyEntry({
        ...entry,
        revoked_at: entry.revoked_at || now,
      });
    });

    if (!matched) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const updatedPreferences = normalizePreferences({
      ...preferences,
      api_keys: apiKeys,
    });

    await saveUserProfileState(userId, {
      firstName: profileRow.first_name,
      lastName: profileRow.last_name,
      preferences: updatedPreferences,
    });

    await logUserActivity(userId, 'api_key_revoked');
    return res.json({
      message: 'API key revoked',
      apiKeys: updatedPreferences.api_keys.map(serializeApiKey),
    });
  } catch (err) {
    return next(err);
  }
};

exports.deactivateAccount = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const result = await db.query(
      `UPDATE users
       SET status = 'disabled'
       WHERE user_id = $1
       RETURNING user_id, status`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query('DELETE FROM user_session WHERE user_id = $1', [userId]);
    await logUserActivity(userId, 'account_disabled_self');

    return res.json({
      message: 'Account disabled',
      user: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
};
