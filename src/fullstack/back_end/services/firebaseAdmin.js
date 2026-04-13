const admin = require('firebase-admin');
const config = require('../config/env');

function getPrivateKey() {
  return config.firebase.privateKey ? config.firebase.privateKey.replace(/\\n/g, '\n') : '';
}

function firebaseAdminEnabled() {
  return Boolean(
    config.firebase.projectId &&
      config.firebase.clientEmail &&
      getPrivateKey()
  );
}

function initFirebaseAdmin() {
  if (!firebaseAdminEnabled()) {
    return null;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: getPrivateKey(),
      }),
      projectId: config.firebase.projectId,
      storageBucket: config.firebase.storageBucket || undefined,
    });
  }

  return admin;
}

function getFirebaseAuth() {
  const app = initFirebaseAdmin();
  return app ? admin.auth() : null;
}

function getFirestore() {
  const app = initFirebaseAdmin();
  return app ? admin.firestore() : null;
}

module.exports = {
  firebaseAdminEnabled,
  initFirebaseAdmin,
  getFirebaseAuth,
  getFirestore,
};
