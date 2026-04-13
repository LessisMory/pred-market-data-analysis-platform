const { C, Logo, Btn, Tag } = window;
const { useState, useEffect, useMemo } = React;

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

// ─── Mock data (replace with API calls below) ────────────────────────────────

const MOCK_USERS = [
  { user_id: 1, id: "U-001", name: "Jane Doe",      email: "jane@example.com",      plan: "Pro",   joined: "Nov 28, 2025", lastLogin: "Apr 03, 2026", trades: 87,  status: "ACTIVE"   },
  { user_id: 2, id: "U-002", name: "Carlos Mendes", email: "carlos@tradelab.io",    plan: "Elite", joined: "Oct 12, 2025", lastLogin: "Apr 03, 2026", trades: 214, status: "ACTIVE"   },
  { user_id: 3, id: "U-003", name: "Priya Nair",    email: "priya@hedgefund.ai",    plan: "Elite", joined: "Sep 05, 2025", lastLogin: "Apr 01, 2026", trades: 332, status: "ACTIVE"   },
  { user_id: 4, id: "U-004", name: "Tom Brauer",    email: "tom@btcalgo.com",       plan: "Pro",   joined: "Dec 14, 2025", lastLogin: "Mar 29, 2026", trades: 45,  status: "ACTIVE"   },
  { user_id: 5, id: "U-005", name: "Lena Fischer",  email: "lena@quant.de",         plan: "Free",  joined: "Jan 02, 2026", lastLogin: "Mar 20, 2026", trades: 3,   status: "DISABLED" },
  { user_id: 6, id: "U-006", name: "Marco Rossi",   email: "marco@pmfund.it",       plan: "Pro",   joined: "Feb 18, 2026", lastLogin: "Apr 02, 2026", trades: 29,  status: "ACTIVE"   },
  { user_id: 7, id: "U-007", name: "Aiko Tanaka",   email: "aiko@algo.jp",          plan: "Elite", joined: "Aug 30, 2025", lastLogin: "Apr 03, 2026", trades: 501, status: "ACTIVE"   },
  { user_id: 8, id: "U-008", name: "Dave Kim",      email: "dave@polybot.us",       plan: "Free",  joined: "Mar 10, 2026", lastLogin: "Mar 15, 2026", trades: 0,   status: "DISABLED" },
];

const MOCK_TRANSACTIONS = [
  { id: "SYS-4421", time: "11:04:02", type: "Subscription Renewal", user: "carlos@tradelab.io",  amount: "$29.99", status: "SUCCESS" },
  { id: "SYS-4420", time: "10:58:31", type: "New Registration",     user: "new_user@mail.com",   amount: "—",      status: "SUCCESS" },
  { id: "SYS-4419", time: "10:47:14", type: "Password Reset",       user: "tom@btcalgo.com",     amount: "—",      status: "SUCCESS" },
  { id: "SYS-4418", time: "10:33:05", type: "Plan Upgrade",         user: "priya@hedgefund.ai",  amount: "$99.00", status: "SUCCESS" },
  { id: "SYS-4417", time: "10:21:49", type: "Account Disabled",     user: "lena@quant.de",       amount: "—",      status: "WARN"    },
  { id: "SYS-4416", time: "10:10:02", type: "Subscription Renewal", user: "jane@example.com",    amount: "$9.99",  status: "SUCCESS" },
  { id: "SYS-4415", time: "09:58:37", type: "Failed Payment",       user: "dave@polybot.us",     amount: "$9.99",  status: "ERROR"   },
  { id: "SYS-4414", time: "09:44:11", type: "Subscription Renewal", user: "aiko@algo.jp",        amount: "$99.00", status: "SUCCESS" },
];

const MOCK_PLATFORM = {
  revenue: "$4,820",
  mrr: "$478.90",
  avgTrades: 151,
  churnRate: "2.4%",
  conversionRate: "38%",
  planDist: [
    { label: "Elite", count: 3, pct: 37, color: C.amber },
    { label: "Pro",   count: 3, pct: 37, color: C.accent },
    { label: "Free",  count: 2, pct: 26, color: C.muted },
  ],
  topTraders: [
    { rank: 1, name: "Aiko Tanaka",   trades: 501, color: C.amber  },
    { rank: 2, name: "Priya Nair",    trades: 332, color: C.accent },
    { rank: 3, name: "Carlos Mendes", trades: 214, color: C.accent },
    { rank: 4, name: "Jane Doe",      trades: 87,  color: C.blue   },
    { rank: 5, name: "Tom Brauer",    trades: 45,  color: C.blue   },
  ],
  dau: [
    { day: "Mar 28", count: 3 }, { day: "Mar 29", count: 5 },
    { day: "Mar 30", count: 4 }, { day: "Mar 31", count: 6 },
    { day: "Apr 01", count: 7 }, { day: "Apr 02", count: 6 },
    { day: "Apr 03", count: 7 },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const planColor = p => ({ Elite: C.amber, Pro: C.accent, Free: C.muted }[p] || C.muted);

const StatusBadge = ({ status }) => {
  const cfg = {
    ACTIVE:   { bg: `${C.accent}20`, border: `${C.accent}50`, color: C.accent },
    DISABLED: { bg: `${C.red}20`,    border: `${C.red}50`,    color: C.red    },
    SUCCESS:  { bg: `${C.accent}20`, border: `${C.accent}50`, color: C.accent },
    WARN:     { bg: `${C.amber}20`,  border: `${C.amber}50`,  color: C.amber  },
    ERROR:    { bg: `${C.red}20`,    border: `${C.red}50`,    color: C.red    },
  }[status] || { bg: `${C.muted}20`, border: `${C.muted}50`, color: C.muted };
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 10px", borderRadius: 4, fontFamily: "'JetBrains Mono'" }}>
      {status}
    </span>
  );
};

const KpiCard = ({ label, value, color, sub }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
    <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>{label}</div>
    <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: color || C.white }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const ColHeader = ({ children, style }) => (
  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, ...style }}>{children}</div>
);

const RoleBadge = ({ role }) => {
  const isAdmin = String(role || '').toUpperCase() === 'ADMIN';
  const color = isAdmin ? C.amber : C.blue;
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}45`, color, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '3px 10px', borderRadius: 4, fontFamily: "'JetBrains Mono'" }}>
      {isAdmin ? 'ADMIN' : 'USER'}
    </span>
  );
};

// ─── Tab views ────────────────────────────────────────────────────────────────

const AllUsersTab = ({
  users,
  searchQuery,
  setSearchQuery,
  addUserForm,
  setAddUserForm,
  onAddUser,
  onDeleteUser,
  onPromoteUser,
  busyAction,
}) => {
  const filtered = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    ), [users, searchQuery]);

  const counts = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.status === 'ACTIVE').length,
    disabled: users.filter(u => u.status === 'DISABLED').length,
    elite:    users.filter(u => u.plan === 'Elite').length,
    pro:      users.filter(u => u.plan === 'Pro').length,
    free:     users.filter(u => u.plan === 'Free').length,
  }), [users]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
        <KpiCard label="TOTAL USERS"   value={counts.total}    color={C.white}  />
        <KpiCard label="ACTIVE"        value={counts.active}   color={C.accent} />
        <KpiCard label="DISABLED"      value={counts.disabled} color={C.red}    />
        <KpiCard label="ELITE MEMBERS" value={counts.elite}    color={C.amber}  />
        <KpiCard label="PRO MEMBERS"   value={counts.pro}      color={C.accent} />
        <KpiCard label="FREE USERS"    value={counts.free}     color={C.muted}  />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>User Directory</div>
          <input
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 13, outline: "none", width: 260 }}
            onFocus={e => e.target.style.borderColor = C.accent}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr 120px', gap: 12, padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
          <input
            placeholder="Full name"
            value={addUserForm.name}
            onChange={e => setAddUserForm(prev => ({ ...prev, name: e.target.value }))}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.white, fontSize: 13, outline: 'none' }}
          />
          <input
            placeholder="Email address"
            value={addUserForm.email}
            onChange={e => setAddUserForm(prev => ({ ...prev, email: e.target.value }))}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.white, fontSize: 13, outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Temp password"
            value={addUserForm.password}
            onChange={e => setAddUserForm(prev => ({ ...prev, password: e.target.value }))}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.white, fontSize: 13, outline: 'none' }}
          />
          <button
            onClick={onAddUser}
            disabled={busyAction === 'create-user'}
            style={{ background: C.accent, border: 'none', borderRadius: 8, padding: '10px 12px', color: C.bg, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busyAction === 'create-user' ? 0.7 : 1 }}
          >
            {busyAction === 'create-user' ? 'Adding...' : 'Add User'}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1.5fr 90px 90px 1fr 1fr 80px 100px 220px", padding: "12px 24px", background: `${C.bg}80`, borderBottom: `1px solid ${C.border}` }}>
          {["ID","NAME","EMAIL","ROLE","PLAN","JOINED","LAST LOGIN","TRADES","STATUS","ACTIONS"].map(h => <ColHeader key={h}>{h}</ColHeader>)}
        </div>

        {filtered.map((u, i) => (
          <div
            key={u.id}
            style={{ display: "grid", gridTemplateColumns: "80px 1fr 1.5fr 90px 90px 1fr 1fr 80px 100px 220px", padding: "18px 24px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}50` : "none", alignItems: "center", transition: "background 0.15s", cursor: "default" }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.bg}60`}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: C.muted }}>{u.id}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{u.email}</div>
            <RoleBadge role={u.role} />
            <div style={{ fontSize: 13, fontWeight: 600, color: planColor(u.plan) }}>{u.plan}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{u.joined}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{u.lastLogin}</div>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13 }}>{u.trades}</div>
            <StatusBadge status={u.status} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => onPromoteUser(u)}
                disabled={String(u.role || '').toUpperCase() === 'ADMIN' || busyAction === `promote-${u.user_id}`}
                style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}40`, color: C.amber, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, cursor: String(u.role || '').toUpperCase() === 'ADMIN' ? 'not-allowed' : 'pointer', opacity: String(u.role || '').toUpperCase() === 'ADMIN' ? 0.5 : 1 }}
              >
                {busyAction === `promote-${u.user_id}` ? 'Saving...' : 'Make Admin'}
              </button>
              <button
                onClick={() => onDeleteUser(u)}
                disabled={busyAction === `delete-${u.user_id}`}
                style={{ background: `${C.red}18`, border: `1px solid ${C.red}40`, color: C.red, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: busyAction === `delete-${u.user_id}` ? 0.7 : 1 }}
              >
                {busyAction === `delete-${u.user_id}` ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DisableAccountsTab = ({ users, onToggle }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
      Toggle a user's account status below. Disabled users cannot sign in or access data until re-enabled.
    </p>
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1.5fr 100px 110px 140px", padding: "12px 24px", background: `${C.bg}80`, borderBottom: `1px solid ${C.border}` }}>
        {["ID","NAME","EMAIL","PLAN","STATUS","ACTION"].map(h => <ColHeader key={h}>{h}</ColHeader>)}
      </div>
      {users.map((u, i) => (
        <div
          key={u.id}
          style={{ display: "grid", gridTemplateColumns: "80px 1fr 1.5fr 100px 110px 140px", padding: "18px 24px", borderBottom: i < users.length - 1 ? `1px solid ${C.border}50` : "none", alignItems: "center", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = `${C.bg}60`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: C.muted }}>{u.id}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
          <div style={{ fontSize: 13, color: C.muted }}>{u.email}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: planColor(u.plan) }}>{u.plan}</div>
          <StatusBadge status={u.status} />
          {u.status === 'ACTIVE' ? (
            <button
              onClick={() => onToggle(u.user_id)}
              style={{ background: `${C.red}20`, border: `1px solid ${C.red}50`, color: C.red, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.red}35`}
              onMouseLeave={e => e.currentTarget.style.background = `${C.red}20`}
            >
              🚫 Disable
            </button>
          ) : (
            <button
              onClick={() => onToggle(u.user_id)}
              style={{ background: `${C.accent}20`, border: `1px solid ${C.accent}50`, color: C.accent, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.accent}35`}
              onMouseLeave={e => e.currentTarget.style.background = `${C.accent}20`}
            >
              ✅ Enable
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

const ResetPasswordsTab = ({ users, onReset }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
      Send a password reset link to any user. The user will receive an email with a secure one-time link.
    </p>
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1.5fr 110px 140px", padding: "12px 24px", background: `${C.bg}80`, borderBottom: `1px solid ${C.border}` }}>
        {["ID","NAME","EMAIL","STATUS","ACTION"].map(h => <ColHeader key={h}>{h}</ColHeader>)}
      </div>
      {users.map((u, i) => (
        <div
          key={u.id}
          style={{ display: "grid", gridTemplateColumns: "80px 1fr 1.5fr 110px 140px", padding: "18px 24px", borderBottom: i < users.length - 1 ? `1px solid ${C.border}50` : "none", alignItems: "center", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = `${C.bg}60`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: C.muted }}>{u.id}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
          <div style={{ fontSize: 13, color: C.muted }}>{u.email}</div>
          <StatusBadge status={u.status} />
          <button
            onClick={() => onReset(u)}
            style={{ background: `${C.blue}15`, border: `1px solid ${C.blue}40`, color: C.blue, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.blue}30`}
            onMouseLeave={e => e.currentTarget.style.background = `${C.blue}15`}
          >
            🔑 Send Reset
          </button>
        </div>
      ))}
    </div>
  </div>
);

const SystemTransactionsTab = ({ transactions }) => {
  const counts = useMemo(() => ({
    total:   transactions.length,
    revenue: transactions.filter(t => t.amount !== "—").reduce((s, t) => s + parseFloat(t.amount.replace('$','')||0), 0).toFixed(2),
    errors:  transactions.filter(t => t.status === 'ERROR').length,
    warnings:transactions.filter(t => t.status === 'WARN').length,
  }), [transactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard label="TOTAL TODAY"   value={counts.total}           color={C.white}  />
        <KpiCard label="REVENUE TODAY" value={`$${counts.revenue}`}   color={C.accent} />
        <KpiCard label="ERRORS"        value={counts.errors}          color={C.red}    />
        <KpiCard label="WARNINGS"      value={counts.warnings}        color={C.amber}  />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, fontSize: 16, fontWeight: 600 }}>
          System Event Log
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "100px 90px 1.2fr 1.5fr 90px 100px", padding: "12px 24px", background: `${C.bg}80`, borderBottom: `1px solid ${C.border}` }}>
          {["TXN ID","TIME","TYPE","USER","AMOUNT","STATUS"].map(h => <ColHeader key={h}>{h}</ColHeader>)}
        </div>
        {transactions.map((t, i) => (
          <div
            key={t.id}
            style={{ display: "grid", gridTemplateColumns: "100px 90px 1.2fr 1.5fr 90px 100px", padding: "18px 24px", borderBottom: i < transactions.length - 1 ? `1px solid ${C.border}50` : "none", alignItems: "center", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.bg}60`}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: C.muted }}>{t.id}</div>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.blue }}>{t.time}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t.type}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{t.user}</div>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13 }}>{t.amount}</div>
            <StatusBadge status={t.status} />
          </div>
        ))}
      </div>
    </div>
  );
};

const PlatformAnalysisTab = ({ data }) => {
  const topTraders = (data.topTraders || []).map((trader, index) => ({
    ...trader,
    color: trader.color || [C.amber, C.accent, C.blue, C.blue, C.muted][index] || C.muted,
  }));
  const planDist = (data.planDist || []).map(item => ({
    ...item,
    color: item.color || planColor(item.label),
  }));
  const dau = data.dau || [];
  const maxTrades = Math.max(1, ...topTraders.map(t => t.trades || 0));
  const maxDau    = Math.max(1, ...dau.map(d => d.count || 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        <KpiCard label="TOTAL PLATFORM REVENUE" value={data.revenue}        color={C.accent} sub="All time" />
        <KpiCard label="MRR"                     value={data.mrr}            color={C.blue}   sub="This month" />
        <KpiCard label="AVG. TRADES / USER"      value={data.avgTrades}      color={C.amber}  sub="Active users only" />
        <KpiCard label="CHURN RATE"              value={data.churnRate}      color={C.red}    sub="Last 30 days" />
        <KpiCard label="CONVERSION RATE"         value={data.conversionRate} color={C.accent} sub="Free → Paid" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>

        {/* Plan Distribution */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Plan Distribution</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>Users by subscription tier</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {planDist.map(p => (
              <div key={p.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{p.label}</span>
                  <span style={{ fontSize: 12, color: p.color, fontFamily: "'JetBrains Mono'" }}>{p.count} users · {p.pct}%</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: p.color, borderRadius: 3, transition: "width 0.8s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Traders */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Top Traders by Volume</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>Ranked by total trades executed</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {topTraders.map(t => (
              <div key={t.rank}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: t.rank === 1 ? C.amber : C.muted }}>#{t.rank}</span>
                    <span style={{ fontSize: 14, fontWeight: t.rank === 1 ? 700 : 400 }}>{t.name}</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13 }}>{t.trades}</span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(t.trades / maxTrades) * 100}%`, background: t.color, borderRadius: 2, transition: "width 0.8s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Active Users */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Daily Active Users</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>Unique logins per day — last 7 days</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {dau.map(d => (
              <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: C.muted, width: 50, flexShrink: 0 }}>{d.day}</span>
                <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(d.count / maxDau) * 100}%`, background: C.accent, borderRadius: 4, transition: "width 0.8s ease" }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.white, width: 16, textAlign: "right" }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Main Admin Screen ────────────────────────────────────────────────────────

const AdminScreen = () => {
  const [activeTab, setActiveTab]     = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers]             = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [busyAction, setBusyAction]   = useState('');
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', password: '' });
  const [transactions, setTransactions] = useState([]);
  const [platformData, setPlatformData] = useState(MOCK_PLATFORM);
  const adminName                     = localStorage.getItem('ob_user_name') || 'Admin';

  // Route guard — redirect non-admins immediately before any render
  useEffect(() => {
    const guardAdminRoute = async () => {
      // Backend-only admin bypass: if we already have an admin role + token
      // stored locally, trust it and skip Firebase session sync (which would
      // wipe the session because no Firebase user is signed in).
      const storedRole = localStorage.getItem('ob_user_role');
      const storedToken = localStorage.getItem('jwt_token');
      if (storedRole === 'admin' && storedToken) {
        return;
      }

      await window.FirebaseAuthClient?.ensureSession?.();

      if (localStorage.getItem('ob_user_role') !== 'admin') {
        window.location.href = 'menu.html';
      }
    };

    guardAdminRoute();
  }, []);

  const fetchAdminData = async ({ keepLoading = false } = {}) => {
    if (!keepLoading) {
      setIsLoading(true);
    }

    try {
      if (localStorage.getItem('ob_user_role') !== 'admin') {
        await window.FirebaseAuthClient?.ensureSession?.();
      }
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` };
      const [usersRes, transactionsRes, platformRes] = await Promise.all([
        fetch(`${API_BASE}/v1/admin/users`, { headers }),
        fetch(`${API_BASE}/v1/admin/transactions`, { headers }),
        fetch(`${API_BASE}/v1/admin/platform`, { headers })
      ]);

      if (!usersRes.ok || !transactionsRes.ok || !platformRes.ok) {
        throw new Error(`HTTP ${usersRes.status}/${transactionsRes.status}/${platformRes.status}`);
      }

      const [usersData, transactionsData, platformPayload] = await Promise.all([
        usersRes.json(),
        transactionsRes.json(),
        platformRes.json()
      ]);

      const usersList = Array.isArray(usersData) ? usersData : (Array.isArray(usersData?.users) ? usersData.users : []);
      setUsers(usersList);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setPlatformData(platformPayload || MOCK_PLATFORM);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setUsers(MOCK_USERS);
      setTransactions(MOCK_TRANSACTIONS);
      setPlatformData(MOCK_PLATFORM);
    } finally {
      setIsLoading(false);
    }
  };

  // GET /v1/admin/users + transactions + platform — load admin monitor data
  useEffect(() => {
    fetchAdminData();
  }, []);

  // PATCH /v1/admin/users/:id/status — persist status change
  const handleToggleStatus = async (userId) => {
    const user = users.find(u => u.user_id === userId);
    const newStatus = user?.status === 'ACTIVE' ? 'disabled' : 'active';

    try {
      if (localStorage.getItem('ob_user_role') !== 'admin') {
        await window.FirebaseAuthClient?.ensureSession?.();
      }
      const res = await fetch(`${API_BASE}/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user status.');
      }

      setUsers(prev => prev.map(item =>
        item.user_id === userId
          ? { ...item, status: String(data.user?.status || newStatus).toUpperCase() }
          : item
      ));
    } catch (err) {
      console.error('Failed to update user status:', err);
      alert(err.message || 'Failed to update user status.');
    }
  };

  // POST /v1/admin/users/:id/reset-password — trigger password reset
  const handleResetPassword = async (user) => {
    try {
      if (localStorage.getItem('ob_user_role') !== 'admin') {
        await window.FirebaseAuthClient?.ensureSession?.();
      }
      const res = await fetch(`${API_BASE}/v1/admin/users/${user.user_id}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send password reset.');
      }

      alert(`Reset link generated for ${user.email}`);
    } catch (err) {
      console.error('Failed to reset password:', err);
      alert(err.message || 'Failed to reset password.');
    }
  };

  const handleCreateUser = async () => {
    const payload = {
      name: addUserForm.name.trim(),
      email: addUserForm.email.trim(),
      password: addUserForm.password,
    };

    if (!payload.name || !payload.email || !payload.password) {
      alert('Name, email, and password are required.');
      return;
    }

    setBusyAction('create-user');

    try {
      const res = await fetch(`${API_BASE}/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user.');
      }

      setAddUserForm({ name: '', email: '', password: '' });
      await fetchAdminData({ keepLoading: true });
      alert(`Created user ${data.user?.email || payload.email}`);
    } catch (err) {
      console.error('Failed to create user:', err);
      alert(err.message || 'Failed to create user.');
    } finally {
      setBusyAction('');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) {
      return;
    }

    setBusyAction(`delete-${user.user_id}`);

    try {
      const res = await fetch(`${API_BASE}/v1/admin/users/${user.user_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user.');
      }

      setUsers(prev => prev.filter(item => item.user_id !== user.user_id));
      alert(`Deleted ${user.email}`);
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(err.message || 'Failed to delete user.');
    } finally {
      setBusyAction('');
    }
  };

  const handlePromoteUser = async (user) => {
    if (String(user.role || '').toUpperCase() === 'ADMIN') {
      return;
    }

    setBusyAction(`promote-${user.user_id}`);

    try {
      const res = await fetch(`${API_BASE}/v1/admin/users/${user.user_id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({ role: 'admin' })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role.');
      }

      setUsers(prev => prev.map(item =>
        item.user_id === user.user_id
          ? { ...item, role: data.user?.role || 'admin' }
          : item
      ));
      alert(`${user.email} is now an admin.`);
    } catch (err) {
      console.error('Failed to update user role:', err);
      alert(err.message || 'Failed to update user role.');
    } finally {
      setBusyAction('');
    }
  };

  const tabs = [
    { id: 'users',        label: '👥 All Users' },
    { id: 'disable',      label: '🚫 Disable Accounts' },
    { id: 'passwords',    label: '🔑 Reset Passwords' },
    { id: 'transactions', label: '📋 System Transactions' },
    { id: 'platform',     label: '📊 Platform Analysis' },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.white, fontFamily: "'DM Sans'" }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 32px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo size={14} />
          <span style={{ background: `${C.red}20`, border: `1px solid ${C.red}50`, color: C.red, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 4, letterSpacing: 1 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>← Menu</Btn>
          <button
            onClick={handleSignOut}
            style={{ background: "transparent", border: `1px solid ${C.red}40`, color: C.red, borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans'" }}
            onMouseEnter={e => e.target.style.background = `${C.red}15`}
            onMouseLeave={e => e.target.style.background = "transparent"}
          >
            Sign Out
          </button>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
            {adminName[0].toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.surface, paddingLeft: 32 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{ background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === t.id ? C.red : 'transparent'}`, color: activeTab === t.id ? C.white : C.muted, padding: "14px 20px", fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400, cursor: "pointer", transition: "0.15s", whiteSpace: "nowrap" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main style={{ flex: 1, padding: "32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${C.accent}20`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {activeTab === 'users'        && (
              <AllUsersTab
                users={users}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                addUserForm={addUserForm}
                setAddUserForm={setAddUserForm}
                onAddUser={handleCreateUser}
                onDeleteUser={handleDeleteUser}
                onPromoteUser={handlePromoteUser}
                busyAction={busyAction}
              />
            )}
            {activeTab === 'disable'      && <DisableAccountsTab users={users} onToggle={handleToggleStatus} />}
            {activeTab === 'passwords'    && <ResetPasswordsTab users={users} onReset={handleResetPassword} />}
            {activeTab === 'transactions' && <SystemTransactionsTab transactions={transactions} />}
            {activeTab === 'platform'     && <PlatformAnalysisTab data={platformData} />}
          </>
        )}
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<AdminScreen />);
