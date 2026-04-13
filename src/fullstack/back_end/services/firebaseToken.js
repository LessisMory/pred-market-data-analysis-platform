const config = require('../config/env');

function base64UrlDecode(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');

  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch (_err) {
    return null;
  }
}

function isProbablyFirebaseIdToken(token) {
  const payload = decodeJwtPayload(token);

  if (!payload || !config.firebase.projectId) {
    return false;
  }

  return (
    payload.aud === config.firebase.projectId &&
    payload.iss === `https://securetoken.google.com/${config.firebase.projectId}` &&
    Boolean(payload.sub)
  );
}

function decodeFirebaseIdTokenUnsafe(token) {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    const error = new Error('Invalid Firebase token');
    error.status = 401;
    throw error;
  }

  if (!config.firebase.projectId) {
    const error = new Error('Firebase project is not configured');
    error.status = 503;
    throw error;
  }

  if (
    payload.aud !== config.firebase.projectId ||
    payload.iss !== `https://securetoken.google.com/${config.firebase.projectId}` ||
    !payload.sub
  ) {
    const error = new Error('Invalid Firebase token');
    error.status = 401;
    throw error;
  }

  if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
    const error = new Error('Token expired');
    error.status = 401;
    error.code = 'auth/id-token-expired';
    throw error;
  }

  return payload;
}

module.exports = {
  decodeJwtPayload,
  isProbablyFirebaseIdToken,
  decodeFirebaseIdTokenUnsafe,
};
