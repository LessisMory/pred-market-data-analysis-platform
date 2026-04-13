const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { firebaseAdminEnabled, getFirebaseAuth } = require('../services/firebaseAdmin');
const { syncFirebaseUser } = require('../services/firebaseAuthSync');
const { isProbablyFirebaseIdToken } = require('../services/firebaseToken');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.slice(7);

  if (firebaseAdminEnabled()) {
    try {
      const decoded = await getFirebaseAuth().verifyIdToken(token);
      req.user = await syncFirebaseUser({ idToken: token, decodedToken: decoded });
      return next();
    } catch (firebaseErr) {
      if (firebaseErr.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Token expired' });
      }
    }
  }

  if (isProbablyFirebaseIdToken(token)) {
    try {
      req.user = await syncFirebaseUser({ idToken: token });
      return next();
    } catch (firebaseErr) {
      const message = firebaseErr.code === 'auth/id-token-expired' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ error: message });
    }
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    req.user = payload; // { user_id, email, role, iat, exp }
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authenticate;
