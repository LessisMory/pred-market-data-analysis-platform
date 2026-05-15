const { C, Logo, Btn, Tag } = window;
const { useState, useEffect } = React;

const defaultNotifications = {
  marketAlerts: true,
  weeklyDigest: true,
  securityAlerts: true,
  productUpdates: false,
};

const formatPlanName = (plan) => {
  const key = String(plan || '').toLowerCase();
  if (key === 'premium' || key === 'pro') return 'Pro';
  if (key === 'institutional' || key === 'elite') return 'Elite';
  if (key === 'free') return 'Free';
  return plan || 'Free';
};

const formatActivityLabel = (activityType) =>
  String(activityType || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Account Activity';

const formatActivityDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

const formatLastActive = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

const providerLabel = (provider) => {
  const key = String(provider || '').toLowerCase();
  if (key === 'google.com') return 'Google';
  if (key === 'github.com') return 'GitHub';
  if (key === 'password') return 'Email & Password';
  if (key === 'phone') return 'Phone';
  return provider || 'Account';
};

const ProfileScreen = () => {
  const [userName, setUserName] = useState('Trader');
  const [activeTab, setActiveTab] = useState('edit_profile');
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [authProvider, setAuthProvider] = useState('password');
  const [latestGeneratedKey, setLatestGeneratedKey] = useState('');
  const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '' });
  const [emailForm, setEmailForm] = useState({ email: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [apiKeys, setApiKeys] = useState([]);
  const [userStats, setUserStats] = useState({
    email: 'trader@example.com',
    memberSince: 'Nov 2025',
    totalTrades: '0',
    totalVolume: '$0.00',
    accountStatus: 'ACTIVE',
    lastActive: 'Never',
    planName: 'Free',
  });
  const [activities, setActivities] = useState([]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
  });

  const loadProfileData = async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      await window.FirebaseAuthClient?.ensureSession?.();
      const headers = { Authorization: `Bearer ${localStorage.getItem('jwt_token')}` };
      const [profileRes, activityRes] = await Promise.all([
        fetch('/v1/user/profile', { headers }),
        fetch('/v1/user/activities', { headers }),
      ]);

      if (!profileRes.ok || !activityRes.ok) {
        throw new Error(`HTTP ${profileRes.status}/${activityRes.status}`);
      }

      const profile = await profileRes.json();
      const activityRows = await activityRes.json();
      const resolvedName =
        profile.name || [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Trader';

      setUserName(resolvedName);
      localStorage.setItem('ob_user_name', resolvedName);
      localStorage.setItem('ob_user_role', profile.role || 'user');
      localStorage.setItem('ob_auth_source', profile.authProvider || 'password');
      setAuthProvider(profile.authProvider || 'password');
      setProfileForm({
        firstName: profile.firstName || resolvedName.split(' ')[0] || '',
        lastName: profile.lastName || resolvedName.split(' ').slice(1).join(' ') || '',
      });
      setEmailForm({ email: profile.email || '' });
      setNotifications({
        ...defaultNotifications,
        ...(profile.preferences?.notifications || {}),
      });
      setApiKeys(Array.isArray(profile.apiKeys) ? profile.apiKeys : []);
      setUserStats({
        email: profile.email || '—',
        memberSince: profile.memberSince || 'Unknown',
        totalTrades: Number(profile.stats?.total_trades || 0).toLocaleString('en-US'),
        totalVolume: `$${Number(profile.stats?.total_volume || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        accountStatus: String(profile.status || 'active').toUpperCase(),
        lastActive: formatLastActive(profile.stats?.last_active || profile.last_login),
        planName: formatPlanName(profile.planName || profile.plan),
      });
      setActivities(
        (Array.isArray(activityRows) ? activityRows : []).map(item => ({
          date: formatActivityDate(item.created_at),
          event: formatActivityLabel(item.activity_type),
        }))
      );
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem('ob_user_name');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  useEffect(() => {
    loadProfileData({ showLoader: true });
  }, []);

  const handleSaveChanges = async () => {
    const firstName = String(profileForm.firstName || '').trim();
    const lastName = String(profileForm.lastName || '').trim();

    if (!firstName && !lastName) {
      alert('Please enter at least a first or last name.');
      return;
    }

    setBusyAction('profile');

    try {
      const res = await fetch('/v1/user/update', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ firstName, lastName }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to update profile.');
      }

      setLatestGeneratedKey('');
      await loadProfileData();
      alert('Profile updated successfully.');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert(err.message || 'Unable to update profile.');
    } finally {
      setBusyAction('');
    }
  };

  const handleEmailUpdate = async () => {
    const email = String(emailForm.email || '').trim().toLowerCase();

    if (!/\S+@\S+\.\S+/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setBusyAction('email');

    try {
      const currentUser = await window.FirebaseAuthClient?.getCurrentUser?.();

      if (currentUser) {
        await window.FirebaseAuthClient.updateEmail(email);
      }

      const res = await fetch('/v1/user/email', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to update email.');
      }

      if (currentUser) {
        await window.FirebaseAuthClient.syncSession({ email });
      }

      setLatestGeneratedKey('');
      await loadProfileData();
      alert('Email updated successfully.');
    } catch (err) {
      console.error('Failed to update email:', err);
      alert(err.message || 'Unable to update email.');
    } finally {
      setBusyAction('');
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordForm.newPassword.length < 8) {
      alert('New password must be at least 8 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }

    setBusyAction('password');

    try {
      const currentUser = await window.FirebaseAuthClient?.getCurrentUser?.();

      if (currentUser) {
        await window.FirebaseAuthClient.updatePassword(passwordForm.newPassword);
      }

      const res = await fetch('/v1/user/password', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to update password.');
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setLatestGeneratedKey('');
      await loadProfileData();
      alert('Password updated successfully.');
    } catch (err) {
      console.error('Failed to update password:', err);
      alert(err.message || 'Unable to update password.');
    } finally {
      setBusyAction('');
    }
  };

  const handleNotificationSave = async () => {
    setBusyAction('notifications');

    try {
      const res = await fetch('/v1/user/preferences', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ notifications }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to update notification settings.');
      }

      setLatestGeneratedKey('');
      await loadProfileData();
      alert('Notification preferences saved.');
    } catch (err) {
      console.error('Failed to update preferences:', err);
      alert(err.message || 'Unable to update notification settings.');
    } finally {
      setBusyAction('');
    }
  };

  const handleCreateApiKey = async () => {
    setBusyAction('api-key-create');

    try {
      const res = await fetch('/v1/user/api-keys', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ label: newApiKeyLabel }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to create API key.');
      }

      setLatestGeneratedKey(data.apiKey?.rawKey || '');
      setNewApiKeyLabel('');
      await loadProfileData();
    } catch (err) {
      console.error('Failed to create API key:', err);
      alert(err.message || 'Unable to create API key.');
    } finally {
      setBusyAction('');
    }
  };

  const handleRevokeApiKey = async (apiKeyId) => {
    setBusyAction(`api-key-${apiKeyId}`);

    try {
      const res = await fetch(`/v1/user/api-keys/${apiKeyId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to revoke API key.');
      }

      setApiKeys(Array.isArray(data.apiKeys) ? data.apiKeys : []);
      await loadProfileData();
    } catch (err) {
      console.error('Failed to revoke API key:', err);
      alert(err.message || 'Unable to revoke API key.');
    } finally {
      setBusyAction('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Type DELETE to confirm account deactivation.');
      return;
    }

    setBusyAction('delete-account');

    try {
      const res = await fetch('/v1/user/deactivate', {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to deactivate account.');
      }

      if (window.FirebaseAuthClient) {
        await window.FirebaseAuthClient.logout();
      } else {
        localStorage.removeItem('ob_user_name');
        localStorage.removeItem('ob_user_role');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('ob_auth_source');
      }

      window.location.href = 'index.html';
    } catch (err) {
      console.error('Failed to deactivate account:', err);
      alert(err.message || 'Unable to deactivate account.');
    } finally {
      setBusyAction('');
    }
  };

  const userHandle = `@${userName.toLowerCase().replace(/\s+/g, '')}`;

  const sidebarMenu = [
    { id: 'edit_profile', label: 'Edit Profile' },
    { id: 'change_password', label: 'Change Password' },
    { id: 'update_email', label: 'Update Email' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'api_keys', label: 'API Keys' },
    { id: 'delete_account', label: 'Delete Account', isDanger: true },
  ];

  const renderTabContent = () => {
    if (activeTab === 'edit_profile') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>FIRST NAME</label>
              <input
                type="text"
                value={profileForm.firstName}
                onChange={(event) => setProfileForm(prev => ({ ...prev, firstName: event.target.value }))}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>LAST NAME</label>
              <input
                type="text"
                value={profileForm.lastName}
                onChange={(event) => setProfileForm(prev => ({ ...prev, lastName: event.target.value }))}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>USERNAME</label>
            <input
              type="text"
              disabled
              value={userHandle}
              style={{ width: '100%', background: `${C.bg}80`, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.muted, outline: 'none', cursor: 'not-allowed' }}
            />
          </div>
          <Btn
            style={{ marginTop: 16, alignSelf: 'flex-start' }}
            onClick={handleSaveChanges}
            disabled={busyAction === 'profile'}
          >
            {busyAction === 'profile' ? 'Saving...' : 'Save Changes'}
          </Btn>
        </div>
      );
    }

    if (activeTab === 'update_email') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
            Your current sign-in method is <span style={{ color: C.white, fontWeight: 600 }}>{providerLabel(authProvider)}</span>.
            Updating this value keeps your platform profile and local database in sync.
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>EMAIL ADDRESS</label>
            <input
              type="email"
              value={emailForm.email}
              onChange={(event) => setEmailForm({ email: event.target.value })}
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
            />
          </div>
          <Btn
            style={{ marginTop: 16, alignSelf: 'flex-start' }}
            onClick={handleEmailUpdate}
            disabled={busyAction === 'email'}
          >
            {busyAction === 'email' ? 'Updating...' : 'Update Email'}
          </Btn>
        </div>
      );
    }

    if (activeTab === 'change_password') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
            This updates your application password and, when available, your active Firebase session as well.
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>CURRENT PASSWORD</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm(prev => ({ ...prev, currentPassword: event.target.value }))}
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>NEW PASSWORD</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm(prev => ({ ...prev, newPassword: event.target.value }))}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>CONFIRM PASSWORD</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm(prev => ({ ...prev, confirmPassword: event.target.value }))}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
              />
            </div>
          </div>
          <Btn
            style={{ marginTop: 16, alignSelf: 'flex-start' }}
            onClick={handlePasswordUpdate}
            disabled={busyAction === 'password'}
          >
            {busyAction === 'password' ? 'Updating...' : 'Change Password'}
          </Btn>
        </div>
      );
    }

    if (activeTab === 'notifications') {
      const notificationOptions = [
        ['marketAlerts', 'Market Alerts', 'Receive alerts for major market moves and notable platform events.'],
        ['weeklyDigest', 'Weekly Digest', 'Get a summary of your account activity and weekly platform highlights.'],
        ['securityAlerts', 'Security Alerts', 'Always notify me about security-sensitive account changes.'],
        ['productUpdates', 'Product Updates', 'Receive optional product and feature announcements.'],
      ];

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {notificationOptions.map(([key, title, description]) => (
            <label
              key={key}
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}
            >
              <input
                type="checkbox"
                checked={Boolean(notifications[key])}
                onChange={(event) => setNotifications(prev => ({ ...prev, [key]: event.target.checked }))}
                style={{ marginTop: 2, accentColor: C.accent }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{description}</div>
              </div>
            </label>
          ))}
          <Btn
            style={{ marginTop: 8, alignSelf: 'flex-start' }}
            onClick={handleNotificationSave}
            disabled={busyAction === 'notifications'}
          >
            {busyAction === 'notifications' ? 'Saving...' : 'Save Preferences'}
          </Btn>
        </div>
      );
    }

    if (activeTab === 'api_keys') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
            Create personal API keys for scripted access. Only the masked version is stored for later display, so copy a new key when it is generated.
          </div>

          {latestGeneratedKey && (
            <div style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}35`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>NEW API KEY</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: C.white, wordBreak: 'break-all' }}>{latestGeneratedKey}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Label this key"
              value={newApiKeyLabel}
              onChange={(event) => setNewApiKeyLabel(event.target.value)}
              style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
            />
            <Btn onClick={handleCreateApiKey} disabled={busyAction === 'api-key-create'}>
              {busyAction === 'api-key-create' ? 'Creating...' : 'Create Key'}
            </Btn>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {apiKeys.length === 0 && (
              <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>
                No API keys created yet.
              </div>
            )}

            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{apiKey.label}</div>
                    <Tag color={apiKey.status === 'active' ? C.accent : C.red}>{apiKey.status.toUpperCase()}</Tag>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.white, marginTop: 8 }}>{apiKey.maskedKey}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                    Created {formatActivityDate(apiKey.createdAt)}
                  </div>
                </div>
                <Btn
                  variant="ghost"
                  onClick={() => handleRevokeApiKey(apiKey.id)}
                  disabled={apiKey.status !== 'active' || busyAction === `api-key-${apiKey.id}`}
                  style={{ color: apiKey.status === 'active' ? C.red : C.muted, borderColor: apiKey.status === 'active' ? `${C.red}35` : C.border }}
                >
                  {busyAction === `api-key-${apiKey.id}` ? 'Revoking...' : 'Revoke'}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'delete_account') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ color: C.red, fontSize: 14, fontWeight: 600 }}>
            This will disable your account and sign you out.
          </div>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
            Your account data will remain in the database for audit purposes, but you will no longer be able to use the account until an administrator re-enables it.
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>TYPE DELETE TO CONFIRM</label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.white, outline: 'none' }}
            />
          </div>
          <Btn
            onClick={handleDeleteAccount}
            disabled={busyAction === 'delete-account'}
            style={{ marginTop: 8, alignSelf: 'flex-start', background: C.red, color: C.white }}
          >
            {busyAction === 'delete-account' ? 'Disabling...' : 'Disable Account'}
          </Btn>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, color: C.white, fontFamily: "'DM Sans'" }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(18,18,18,0.8)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.border}`, zIndex: 100 }}>
        <Logo size={14} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>← Menu</Btn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px', background: `${C.accent}10`, borderRadius: 20, border: `1px solid ${C.accent}30` }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{userName}</span>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.accent, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
              {userName[0]}
            </div>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '40px 32px', maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', gap: 32 }}>
        <aside style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12, paddingLeft: 12 }}>ACCOUNT SETTINGS</div>
            {sidebarMenu.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setLatestGeneratedKey('');
                }}
                style={{ textAlign: 'left', padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all 0.2s', background: activeTab === item.id ? C.surface : 'transparent', color: item.isDanger ? C.red : (activeTab === item.id ? C.white : C.muted), borderLeft: activeTab === item.id ? `3px solid ${item.isDanger ? C.red : C.accent}` : '3px solid transparent' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginTop: 'auto' }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>CURRENT PLAN</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{userStats.planName}</span>
              <Tag color={userStats.accountStatus === 'ACTIVE' ? C.accent : C.red}>{userStats.accountStatus}</Tag>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Member since {userStats.memberSince}</div>
            <Btn fullWidth onClick={() => window.location.href = 'membership.html'} style={{ fontSize: 12, padding: '8px' }}>
              Upgrade to Elite
            </Btn>
          </div>
        </aside>

        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, boxShadow: `0 0 30px ${C.accent}40` }}>
              {userName[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <h1 style={{ fontSize: 28, margin: 0, fontWeight: 700 }}>{userName}</h1>
                <Tag color={C.accent}>{userStats.planName.toUpperCase()}</Tag>
              </div>
              <div style={{ fontSize: 14, color: C.muted, display: 'flex', gap: 16 }}>
                <span>{userStats.email}</span>
                <span>{userHandle}</span>
                <span>Member since {userStats.memberSince}</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, color: C.muted }}>
              Loading analytics from server...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { val: userStats.totalTrades, label: 'Total Trades' },
                { val: userStats.totalVolume, label: 'Total Volume' },
                { val: userStats.accountStatus, label: 'Account Status' },
                { val: userStats.lastActive, label: 'Last Active' },
              ].map((stat, index) => (
                <div key={index} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.white, marginBottom: 4 }}>{stat.val}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, flex: 1 }}>
            <div style={{ flex: 1.5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
              <h3 style={{ fontSize: 18, margin: '0 0 24px 0' }}>{sidebarMenu.find(menu => menu.id === activeTab)?.label}</h3>
              {renderTabContent()}
            </div>

            <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>RECENT ACTIVITY</div>
              </div>

              {isLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>
                  Loading logs...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 5, top: 10, bottom: 10, width: 1, background: C.border }} />
                  {activities.map((act, index) => (
                    <div key={`${act.date}-${act.event}-${index}`} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                      <div style={{ width: 11, height: 11, borderRadius: '50%', background: index === 0 ? C.accent : C.surface, border: `2px solid ${C.bg}`, zIndex: 1, marginTop: 4 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: index === 0 ? C.white : C.muted }}>{act.event}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{act.date}</div>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div style={{ color: C.muted, fontSize: 12, paddingLeft: 24 }}>
                      No activity has been logged yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<ProfileScreen />);
