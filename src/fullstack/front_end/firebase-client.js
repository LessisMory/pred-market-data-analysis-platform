const API_BASE = "";

window.FirebaseAuthClient = (() => {
  let initPromise = null;
  let initData = null;
  let authReadyPromise = null;
  let authObserverBound = false;

  function getStoredAuthSource() {
    return localStorage.getItem('ob_auth_source') || '';
  }

  function hasStoredJwt() {
    return Boolean(localStorage.getItem('jwt_token'));
  }

  function isFirebaseSessionSource(source = getStoredAuthSource()) {
    return source === 'firebase' || source === 'google.com' || source === 'phone';
  }

  function clearStoredSession() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('ob_user_name');
    localStorage.removeItem('ob_user_role');
    localStorage.removeItem('ob_auth_source');
  }

  function splitDisplayName(name = '') {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
    };
  }

  function buildFriendlyError(err, fallbackMessage) {
    const code = err?.code || '';

    if (code === 'auth/configuration-not-found') {
      return 'This sign-in method is not enabled in Firebase yet.';
    }
    if (code === 'auth/invalid-api-key') {
      return 'Firebase API key is missing or invalid.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This localhost domain is not authorized in Firebase Authentication.';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return 'An account with this email already exists under a different sign-in method.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'The sign-in popup was closed before authentication finished.';
    }
    if (code === 'auth/popup-blocked') {
      return 'The browser blocked the sign-in popup. Please allow popups and try again.';
    }
    if (code === 'auth/requires-recent-login') {
      return 'Please sign in again before making this account change.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'That email address is already in use.';
    }
    if (code === 'auth/weak-password') {
      return 'The new password is too weak.';
    }
    if (code === 'firebase/not-configured') {
      return 'Google sign-in is not configured for this environment.';
    }

    return err?.message || fallbackMessage;
  }

  function bootstrapFirebaseApp(firebaseConfig) {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }

    initData = {
      enabled: true,
      firebase: firebaseConfig,
      providers: {
        google: true,
      },
    };

    bindAuthObserver();
    return initData;
  }

  async function init() {
    if (initPromise) {
      return initPromise;
    }

    initPromise = fetch(`${API_BASE}/v1/auth/config`)
      .then(async (res) => {
        let data = null;

        try {
          data = await res.json();
        } catch (_err) {
          data = null;
        }

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load Firebase config');
        }

        if (!data?.enabled || !data?.firebase?.apiKey) {
          initData = {
            enabled: false,
            firebase: null,
            providers: {
              google: false,
            },
          };
          return initData;
        }

        return bootstrapFirebaseApp(data.firebase);
      })
      .catch((_err) => {
        initData = {
          enabled: false,
          firebase: null,
          providers: {
            google: false,
          },
        };
        return initData;
      });

    return initPromise;
  }

  async function auth() {
    const state = await init();
    if (!state?.enabled) {
      throw { code: 'firebase/not-configured' };
    }
    return window.firebase.auth();
  }

  async function waitForAuthState() {
    const authApi = await auth();

    if (!authReadyPromise) {
      authReadyPromise = new Promise((resolve) => {
        const unsubscribe = authApi.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });
    }

    return authReadyPromise;
  }

  function bindAuthObserver() {
    if (authObserverBound || !window.firebase?.auth) {
      return;
    }

    authObserverBound = true;
    window.firebase.auth().onIdTokenChanged(async (user) => {
      if (!user) {
        if (isFirebaseSessionSource()) {
          clearStoredSession();
        }
        return;
      }

      if (hasStoredJwt() && !isFirebaseSessionSource()) {
        return;
      }

      try {
        const token = await user.getIdToken();
        localStorage.setItem('jwt_token', token);

        const displayName = user.displayName || user.email || 'User';
        localStorage.setItem('ob_user_name', displayName);
        localStorage.setItem('ob_auth_source', user.providerData?.[0]?.providerId || 'firebase');

        if (!localStorage.getItem('ob_user_role')) {
          await syncSession();
        }
      } catch (err) {
        console.warn('Failed to refresh Firebase session locally:', err);
      }
    });
  }

  async function signInWithProvider(providerName) {
    try {
      const authApi = await auth();
      let provider;

      if (providerName === 'google') {
        provider = new window.firebase.auth.GoogleAuthProvider();
      } else {
        throw new Error(`Unsupported OAuth provider: ${providerName}`);
      }

      const credential = await authApi.signInWithPopup(provider);
      return credential.user;
    } catch (err) {
      throw new Error(buildFriendlyError(err, `${providerName} sign-in failed`));
    }
  }

  async function syncSession(overrides = {}) {
    const currentUser = (await auth()).currentUser || (await waitForAuthState());

    if (!currentUser) {
      clearStoredSession();
      throw new Error('No Firebase user is signed in');
    }

    const displayName = currentUser.displayName || overrides.name || '';
    const derivedName = splitDisplayName(displayName);
    const idToken = await currentUser.getIdToken();
    const res = await fetch(`${API_BASE}/v1/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        email: currentUser.email,
        phone: currentUser.phoneNumber,
        name: displayName,
        firstName: overrides.firstName || derivedName.firstName,
        lastName: overrides.lastName || derivedName.lastName,
        ...overrides,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to sync Firebase session');
    }

    localStorage.setItem('jwt_token', data.token || idToken);
    localStorage.setItem('ob_user_name', data.user.name || currentUser.displayName || data.user.firstName || 'User');
    localStorage.setItem('ob_user_role', data.user.role || 'user');
    localStorage.setItem('ob_auth_source', data.user.authProvider || currentUser.providerData?.[0]?.providerId || 'firebase');
    return data.user;
  }

  async function getCurrentUser() {
    return (await auth()).currentUser || (await waitForAuthState());
  }

  async function updateEmail(newEmail) {
    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        throw new Error('No Firebase user is signed in');
      }

      await currentUser.updateEmail(String(newEmail || '').trim());
      await currentUser.getIdToken(true);
      return currentUser;
    } catch (err) {
      throw new Error(buildFriendlyError(err, 'Unable to update email'));
    }
  }

  async function updatePassword(newPassword) {
    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        throw new Error('No Firebase user is signed in');
      }

      await currentUser.updatePassword(String(newPassword || ''));
      await currentUser.getIdToken(true);
      return currentUser;
    } catch (err) {
      throw new Error(buildFriendlyError(err, 'Unable to update password'));
    }
  }

  async function ensureSession() {
    try {
      if (hasStoredJwt() && !isFirebaseSessionSource()) {
        return null;
      }

      await init();
      if (!initData?.enabled) {
        return null;
      }

      const currentUser = (await auth()).currentUser || (await waitForAuthState());

      if (!currentUser) {
        if (isFirebaseSessionSource()) {
          clearStoredSession();
        }
        return null;
      }

      return await syncSession();
    } catch (err) {
      console.warn('Unable to ensure Firebase session:', err);
      return null;
    }
  }

  async function logout() {
    try {
      const authApi = await auth();
      await authApi.signOut();
    } finally {
      clearStoredSession();
    }
  }

  init().catch((err) => {
    console.warn('Firebase client bootstrap skipped:', err.message || err);
  });

  return {
    init,
    ensureSession,
    getCurrentUser,
    signInWithProvider,
    syncSession,
    updateEmail,
    updatePassword,
    logout,
    providers: () => initData?.providers || {},
  };
})();
