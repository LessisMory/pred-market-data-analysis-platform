const { C, Logo, Input, Btn } = window;
const { useEffect, useState } = React;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const LoginScreen = () => {
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    window.FirebaseAuthClient.init().catch((err) => {
      console.error(err);
      setAuthError(err.message || 'Google sign-in is not available right now. Email sign-in still works.');
    });
  }, []);

  const storeSessionAndRedirect = async (data) => {
    
    if (String(data.user?.status).toUpperCase() === 'DISABLED') {
      if (window.FirebaseAuthClient) {
        await window.FirebaseAuthClient.logout();
      }
      if (window.showErrorModal) {
        window.showErrorModal('Access Denied: Your account has been suspended by an administrator.');
      }
      return;
    }
    const resolvedName = data.user?.name || [data.user?.firstName, data.user?.lastName].filter(Boolean).join(' ').trim() || 'User';
    localStorage.setItem('jwt_token', data.token);
    localStorage.setItem('ob_user_name', resolvedName);
    localStorage.setItem('ob_user_role', data.user?.role || 'user');
    
    localStorage.setItem('ob_auth_source', data.user?.authProvider || (data.user?.role === 'admin' ? 'admin' : 'password'));

    if (window.showSuccessToast) {
      window.showSuccessToast("SYSTEM: Identity verified. Booting terminal...");
    }
    
    setTimeout(() => {
      window.location.href = data.user?.role === 'admin' ? 'admin.html' : 'menu.html';
    }, 1200);
  };

  const finalizeSignIn = async () => {
    const user = await window.FirebaseAuthClient.syncSession();

    if (String(user.status).toUpperCase() === 'DISABLED') {
      if (window.FirebaseAuthClient) {
        await window.FirebaseAuthClient.logout();
      }
      if (window.showErrorModal) {
        window.showErrorModal('Access Denied: Your account has been suspended by an administrator.');
      }
      return; 
    }

    if (window.showSuccessToast) {
      window.showSuccessToast("SYSTEM: OAuth verified. Booting terminal...");
    }

    setTimeout(() => {
      window.location.href = user.role === 'admin' ? 'admin.html' : 'menu.html';
    }, 1200);
  };

  const looksLikeEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleAdminLogin = async () => {
    const res = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: emailValue.trim(), password: passwordValue }),
    });
    const data = await res.json();

    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Invalid admin username or password');
    }

    storeSessionAndRedirect(data);
  };

  const handleLoginSubmit = async () => {
    try {
      if (!looksLikeEmail(emailValue)) {
        await handleAdminLogin();
        return;
      }

      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailValue.trim(),
          password: passwordValue,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.token || !data.user) {
        throw new Error(data.error || 'Login failed');
      }

      storeSessionAndRedirect(data);
    } catch (err) {
      console.error(err);
      
      if (window.showErrorModal) {
        window.showErrorModal(err.message || 'Authentication failed. Please check your credentials.');
      } else {
        console.error("Login Error:", err.message);
      }
    }
  };

  const handleOAuthLogin = async (provider) => {
    try {
      await window.FirebaseAuthClient.signInWithProvider(provider);
      await finalizeSignIn();
    } catch (err) {
      console.error(err);
      
      if (window.showErrorModal) {
        window.showErrorModal(`${provider.toUpperCase()} access denied. ${err.message}`);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <Logo size={15} />
        <Btn variant="ghost" onClick={() => window.location.href = 'index.html'}>← Return to Homepage</Btn>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.accent}08 0%, transparent 80%), ${C.bg}` }}>
        <div style={{ width: 380, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 30px', boxShadow: '0 20px 60px rgba(0,0,0,.4)', minHeight: '480px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Logo size={18} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: C.white }}>Terminal Sign In</div>
            </div>

            {authError && (
              <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}40`, color: C.red, borderRadius: 8, padding: '10px 12px', fontSize: 12, lineHeight: 1.5 }}>
                {authError}
              </div>
            )}

            <button onClick={() => handleOAuthLogin('google')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff', color: '#3c4043', border: '1px solid #dadce0', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <GoogleIcon /> Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 10, color: C.muted }}>OR EMAIL</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <Input label="EMAIL" placeholder="trader@duke.edu" icon="✉" value={emailValue} onChange={e => setEmailValue(e.target.value)} />
            <Input label="PASSWORD" type="password" placeholder="••••••••" icon="🔒" value={passwordValue} onChange={e => setPasswordValue(e.target.value)} />

            <div style={{ marginTop: 4 }}>
              <Btn fullWidth onClick={handleLoginSubmit}>Sign In</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<LoginScreen />);
