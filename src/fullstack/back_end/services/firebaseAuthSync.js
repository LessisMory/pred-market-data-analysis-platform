const db = require('../db');
const config = require('../config/env');
const { getFirebaseAuth, getFirestore, firebaseAdminEnabled } = require('./firebaseAdmin');
const { decodeFirebaseIdTokenUnsafe } = require('./firebaseToken');

let schemaEnsured = false;

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

async function ensureFirebaseSchema() {
  if (schemaEnsured) {
    return;
  }

  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50)');
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)');
  schemaEnsured = true;
}

function buildProfilePayload(authUser, firestoreUser, overrides = {}, provider) {
  const fallbackName = overrides.name || firestoreUser.name || authUser.displayName || authUser.email || authUser.uid;
  const derivedNames = splitName(fallbackName);
  const firstName = overrides.firstName || firestoreUser.firstName || derivedNames.firstName;
  const lastName = overrides.lastName || firestoreUser.lastName || derivedNames.lastName;
  const name = overrides.name || [firstName, lastName].filter(Boolean).join(' ').trim() || fallbackName;

  return {
    firebase_uid: authUser.uid,
    email: authUser.email || firestoreUser.email || overrides.email || `${authUser.uid}@firebase.local`,
    phone: authUser.phoneNumber || overrides.phone || firestoreUser.phone || null,
    firstName,
    lastName,
    name,
    role: firestoreUser.role || overrides.role || 'user',
    status: firestoreUser.status || overrides.status || 'active',
    plan: firestoreUser.plan || overrides.plan || 'free',
    auth_provider: provider || firestoreUser.auth_provider || 'password',
  };
}

function buildProfilePayloadFromDecodedToken(decoded, overrides = {}) {
  const fallbackName = overrides.name || decoded.name || decoded.email || decoded.phone_number || decoded.user_id;
  const derivedNames = splitName(fallbackName);
  const firstName = overrides.firstName || derivedNames.firstName;
  const lastName = overrides.lastName || derivedNames.lastName;
  const name = overrides.name || [firstName, lastName].filter(Boolean).join(' ').trim() || fallbackName;

  return {
    firebase_uid: decoded.user_id || decoded.sub,
    email: decoded.email || overrides.email || `${decoded.sub}@firebase.local`,
    phone: decoded.phone_number || overrides.phone || null,
    firstName,
    lastName,
    name,
    role: overrides.role || 'user',
    status: overrides.status || 'active',
    plan: overrides.plan || 'free',
    auth_provider: decoded.firebase?.sign_in_provider || overrides.auth_provider || 'password',
  };
}

async function upsertPostgresUser(user) {
  const existing = await db.query(
    `SELECT user_id, email, name, phone, role, status, plan
     FROM users
     WHERE firebase_uid = $1 OR email = $2
     ORDER BY user_id ASC
     LIMIT 1`,
    [user.firebase_uid, user.email]
  );

  if (existing.rows.length > 0) {
    const current = existing.rows[0];
    const result = await db.query(
      `UPDATE users
       SET firebase_uid = $1,
           email = $2,
           name = $3,
           phone = $4,
           auth_provider = $5,
           last_login = NOW(),
           role = $6,
           status = $7,
           plan = $8
       WHERE user_id = $9
       RETURNING user_id, firebase_uid, email, name, phone, role, status, plan, auth_provider`,
      [
        user.firebase_uid,
        user.email,
        user.name,
        user.phone,
        user.auth_provider,
        current.role || user.role,
        current.status || user.status,
        current.plan || user.plan,
        current.user_id,
      ]
    );

    return result.rows[0];
  }

  const created = await db.query(
    `INSERT INTO users (firebase_uid, email, password_hash, name, role, status, phone, plan, auth_provider, last_login)
     VALUES ($1, $2, 'firebase-auth', $3, $4, $5, $6, $7, $8, NOW())
     RETURNING user_id, firebase_uid, email, name, phone, role, status, plan, auth_provider`,
    [
      user.firebase_uid,
      user.email,
      user.name,
      user.role,
      user.status,
      user.phone,
      user.plan,
      user.auth_provider,
    ]
  );

  return created.rows[0];
}

function serializeUser(row) {
  const { firstName, lastName } = splitName(row.name);
  return {
    ...row,
    firstName,
    lastName,
    planName: row.plan || null,
  };
}

async function syncFirebaseUser({ idToken, decodedToken, overrides = {} }) {
  await ensureFirebaseSchema();

  if (!firebaseAdminEnabled()) {
    if (config.isProd) {
      const error = new Error('Firebase authentication is not configured');
      error.status = 503;
      throw error;
    }

    const decoded = decodedToken || decodeFirebaseIdTokenUnsafe(idToken);
    const postgresUser = await upsertPostgresUser(buildProfilePayloadFromDecodedToken(decoded, overrides));
    return serializeUser(postgresUser);
  }

  const firebaseAuth = getFirebaseAuth();
  const firestore = getFirestore();
  const decoded = decodedToken || (await firebaseAuth.verifyIdToken(idToken));
  const authUser = await firebaseAuth.getUser(decoded.uid);
  const provider = decoded.firebase?.sign_in_provider || authUser.providerData?.[0]?.providerId || 'password';
  const userRef = firestore.collection('users').doc(decoded.uid);
  const userSnap = await userRef.get();
  const firestoreUser = userSnap.exists ? userSnap.data() : {};
  const mergedUser = buildProfilePayload(authUser, firestoreUser, overrides, provider);

  await userRef.set(
    {
      ...mergedUser,
      updatedAt: new Date().toISOString(),
      createdAt: firestoreUser.createdAt || new Date().toISOString(),
    },
    { merge: true }
  );

  const postgresUser = await upsertPostgresUser(mergedUser);
  await userRef.set(
    {
      role: postgresUser.role,
      status: postgresUser.status,
      plan: postgresUser.plan,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return serializeUser(postgresUser);
}

module.exports = {
  firebaseAdminEnabled,
  syncFirebaseUser,
  serializeUser,
};
