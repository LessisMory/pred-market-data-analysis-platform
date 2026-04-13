const { C, Logo, Tag } = window;
const { useState, useEffect } = React;

const formatPlanName = (plan) => {
  const key = String(plan || '').toLowerCase();

  if (key === 'premium' || key === 'pro') return 'Pro Plan';
  if (key === 'institutional' || key === 'elite') return 'Elite Plan';
  if (key === 'free') return 'Free Plan';
  return plan || 'Free Plan';
};

const MenuScreen = () => {
  const [userName, setUserName]     = useState("Trader");
  const [userPlan, setUserPlan]     = useState("Pro Plan");
  const [isAdmin, setIsAdmin]       = useState(false);
  const [marketData, setMarketData] = useState({
    btcPrice: 67420.50, btcChange: "+2.14%",
    upProb: 0.620, dnProb: 0.380,
    upVol: "$1.2M", dnVol: "$840K"
  });

  // GET /v1/user/me — load user identity, plan tier, and role
  useEffect(() => {
    const fetchUserSummary = async () => {
      try {
        await window.FirebaseAuthClient?.ensureSession?.();
        const res = await fetch(`/v1/user/me`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const resolvedName = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || 'Trader';
        const resolvedPlan = formatPlanName(data.planName || data.plan);

        setUserName(resolvedName);
        setUserPlan(resolvedPlan);
        setIsAdmin(data.role === 'admin');
        localStorage.setItem('ob_user_name', resolvedName);
        localStorage.setItem('ob_user_role', data.role || 'user');
        localStorage.setItem('ob_auth_source', data.authProvider || 'password');
      } catch (err) {
        console.error('Failed to fetch user summary:', err);
        const savedName = localStorage.getItem('ob_user_name');
        if (savedName) setUserName(savedName);
        setIsAdmin(localStorage.getItem('ob_user_role') === 'admin');
      }
    };

    fetchUserSummary();
  }, []);

  // WS /stream/market-pulse — subscribe to live BTC price and Polymarket probability feed
  useEffect(() => {
    // const ws = new WebSocket('wss://api.yourbackend.com/stream/market-pulse');
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   setMarketData(prev => ({ ...prev, ...data }));
    // };
    // return () => ws.close();

    const interval = setInterval(() => {
      setMarketData(prev => {
        const pChange    = (Math.random() - 0.5) * 15;
        const probChange = (Math.random() - 0.5) * 0.01;
        const newUp      = Math.min(Math.max(prev.upProb + probChange, 0.01), 0.99);
        return { ...prev, btcPrice: +(prev.btcPrice + pChange).toFixed(2), upProb: +newUp.toFixed(3), dnProb: +(1 - newUp).toFixed(3) };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { key: "terminal",   icon: "📊", label: "Dashboard",           desc: "BTC 15-minute prediction-market terminal with live-style charts, depth views, and heatmaps", color: C.accent, badge: "LIVE" },
    { key: "wallet",     icon: "💰", label: "My Wallet",           desc: "Track your trading performance P&L, and signal confidence for BTC markets",  color: C.blue },
    { key: "history",    icon: "🧾", label: "Transaction History", desc: "View all past payments, invoices and subscription billing activity",          color: C.amber },
    { key: "membership", icon: "⭐", label: "Membership",          desc: "Manage your plan — upgrade to Pro or Elite for full data access",             color: C.accent, badge: "PRO" },
    { key: "profile",    icon: "👤", label: "My Profile",          desc: "Edit your account details, settings, API keys and notification preferences", color: C.muted }
  ];

  const handleSignOut = async () => {
    if (window.FirebaseAuthClient) {
      await window.FirebaseAuthClient.logout();
    } else {
      localStorage.removeItem('ob_user_name');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('ob_user_role');
      localStorage.removeItem('ob_auth_source');
    }
    window.location.href = 'index.html';
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: C.surface, borderBottom: `1px solid ${C.border}`, zIndex: 10 }}>
        <Logo size={14} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
            <span style={{ fontSize: 12, color: C.muted, fontFamily: "'JetBrains Mono'", textTransform: "uppercase" }}>System: Online</span>
          </div>
          <button
            onClick={handleSignOut}
            style={{ background: "transparent", border: `1px solid ${C.red}40`, color: C.red, borderRadius: 6, padding: "6px 14px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => e.target.style.background = `${C.red}15`}
            onMouseLeave={e => e.target.style.background = "transparent"}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "36px 40px", display: "flex", flexDirection: "column", gap: 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>

        <div>
          <h1 style={{ fontFamily: "'DM Sans'", fontWeight: 300, fontSize: 36, color: C.white, margin: "0 0 8px 0" }}>
            Welcome back, <span style={{ color: C.accent, fontWeight: 600 }}>{userName}</span> 👋
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            <span style={{ color: C.white, fontWeight: 600 }}>{userPlan}</span> · What would you like to do today?
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Market Pulse Overview</div>
          <div style={{ display: "flex", gap: 16 }}>

            <div style={{ flex: 1.5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>BTC/USD (Binance Oracle)</div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 28, fontWeight: 600, color: C.white }}>
                  ${marketData.btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>24h Change</div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, color: C.accent }}>{marketData.btcChange}</div>
              </div>
            </div>

            <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: C.muted }}>Poly BTC 15m <span style={{ color: C.accent, fontWeight: "bold" }}>UP</span></div>
                <Tag color={C.accent}>Vol: {marketData.upVol}</Tag>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 28, fontWeight: 600, color: C.accent }}>
                {marketData.upProb.toFixed(3)} <span style={{ fontSize: 14, color: C.muted }}>c</span>
              </div>
            </div>

            <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: C.muted }}>Poly BTC 15m <span style={{ color: C.red, fontWeight: "bold" }}>DN</span></div>
                <Tag color={C.red}>Vol: {marketData.dnVol}</Tag>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 28, fontWeight: 600, color: C.red }}>
                {marketData.dnProb.toFixed(3)} <span style={{ fontSize: 14, color: C.muted }}>c</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Terminal Modules</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>

            {menuItems.map(item => (
              <div
                key={item.key}
                onClick={() => window.location.href = item.key + '.html'}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px", cursor: "pointer", borderLeft: `4px solid ${item.color}`, transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 28 }}>{item.icon}</div>
                  {item.badge && <Tag color={item.color}>{item.badge}</Tag>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 8 }}>{item.label}</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                <div style={{ marginTop: 16, fontSize: 12, color: item.color, fontWeight: 600 }}>Open &rarr;</div>
              </div>
            ))}

            {isAdmin && (
              <div
                onClick={() => window.location.href = 'admin.html'}
                style={{ background: C.surface, border: `1px solid ${C.red}50`, borderRadius: 12, padding: "24px", cursor: "pointer", borderLeft: `4px solid ${C.red}`, transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.red + '50'; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 28 }}>🛡️</div>
                  <span style={{ background: C.red + '20', border: `1px solid ${C.red}50`, color: C.red, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, letterSpacing: 1 }}>ADMIN</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 8 }}>Admin Panel</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>Manage users, accounts, system transactions and platform analytics.</p>
                <div style={{ marginTop: 16, fontSize: 12, color: C.red, fontWeight: 600 }}>Open &rarr;</div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<MenuScreen />);
