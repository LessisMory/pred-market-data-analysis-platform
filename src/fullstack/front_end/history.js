const { C, Logo, Btn, Tag } = window;
const { useState, useEffect, useMemo } = React;

const formatPaymentStatus = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "completed") return "Paid";
  if (normalized === "refunded") return "Refunded";
  if (normalized === "failed") return "Failed";
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Pending";
};

const formatPlanName = (plan) => {
  const key = String(plan || "").toLowerCase();
  if (key === "premium" || key === "pro") return "Pro";
  if (key === "institutional" || key === "elite") return "Elite";
  if (key === "free") return "Free";
  return plan || "Free";
};

const HistoryScreen = () => {
  const [userName, setUserName]         = useState("Trader");
  const [filter, setFilter]             = useState("All");
  const [isLoading, setIsLoading]       = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [currentPlan, setCurrentPlan]   = useState("Free");
  const [memberSince, setMemberSince]   = useState("—");

  useEffect(() => {
    const savedName = localStorage.getItem('ob_user_name');
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    const fetchUserSummary = async () => {
      try {
        await window.FirebaseAuthClient?.ensureSession?.();
        const res = await fetch(`/v1/user/me`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const resolvedName = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
        if (resolvedName) setUserName(resolvedName);
        setCurrentPlan(formatPlanName(data.planName || data.plan));
        setMemberSince(data.memberSince || '—');
      } catch (err) {
        console.error('Failed to fetch user summary:', err);
      }
    };

    fetchUserSummary();
  }, []);

  // GET /v1/transactions — fetch billing/payment records for the authenticated user
  useEffect(() => {
    const fetchBackendTransactions = async () => {
      try {
        await window.FirebaseAuthClient?.ensureSession?.();
        const res = await fetch(`/v1/transactions`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        const normalised = raw.map(item => ({
          id:     `PAY-${item.payment_id}`,
          date:   new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          desc:   item.amount > 0 ? 'Subscription payment' : 'Plan change',
          amount: `$${parseFloat(item.amount || 0).toFixed(2)}`,
          method: item.payment_type ?? '—',
          status: formatPaymentStatus(item.status),
        }));

        setTransactions(normalised);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setIsLoading(false);
      }
    };

    fetchBackendTransactions();
  }, []);

  // WS /stream — optional: listen for newly settled billing events pushed by backend
  // ws.onmessage = (event) => {
  //   const item = JSON.parse(event.data);
  //   const newTxn = {
  //     id:     `PAY-${item.payment_id}`,
  //     date:   new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
  //     desc:   item.amount > 0 ? 'Subscription payment' : 'Plan change',
  //     amount: `$${parseFloat(item.amount || 0).toFixed(2)}`,
  //     method: item.payment_type ?? '—',
  //     status: formatPaymentStatus(item.status),
  //   };
  //   setTransactions(prev => [newTxn, ...prev]);
  // };

  const filteredTransactions = filter === "All"
    ? transactions
    : transactions.filter(t => t.status === filter);

  // Memoized to avoid recalculating on every render
  const totalBilled = useMemo(() =>
    transactions
      .filter(t => t.status === 'Paid')
      .reduce((sum, t) => sum + parseFloat(t.amount.replace('$', '')), 0),
    [transactions]
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.white, fontFamily: "'DM Sans'" }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(18,18,18,0.8)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}`, zIndex: 100 }}>
        <Logo size={14} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>← Menu</Btn>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px", background: `${C.accent}10`, borderRadius: 20, border: `1px solid ${C.accent}30` }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{userName}</span>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accent, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{userName[0]}</div>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Transaction History</h1>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>All billing activity for your account.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>CURRENT PLAN</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Tag color={C.accent}>{currentPlan}</Tag>
              <span style={{ fontSize: 13, color: C.white }}>Member since {memberSince}</span>
              <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}` }}>Manage Plan</Btn>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>TOTAL BILLED</div>
            <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.white }}>${totalBilled.toFixed(2)}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Lifetime spend</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>TRANSACTIONS</div>
            <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.blue }}>{transactions.length}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Records logged</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>NEXT RENEWAL</div>
            <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.amber }}>Apr 01, 2026</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>$29.00 / month</div>
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", minHeight: 400 }}>

          <div style={{ display: "flex", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginRight: "auto" }}>Invoices & Payments</h3>
            <div style={{ display: "flex", gap: 8, background: C.bg, padding: 4, borderRadius: 8, border: `1px solid ${C.border}` }}>
              {["All", "Paid", "Refunded"].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  style={{ background: filter === status ? C.surface : "transparent", color: filter === status ? C.white : C.muted, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "0.2s" }}
                >
                  {status}
                </button>
              ))}
            </div>
            <Btn variant="ghost" style={{ marginLeft: 16, padding: "6px 12px", fontSize: 12, border: `1px solid ${C.border}` }}>↓ Download CSV</Btn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr", padding: "16px 24px", background: `${C.bg}80`, borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>
            <div>TRANSACTION ID</div>
            <div>DATE</div>
            <div>DESCRIPTION</div>
            <div>AMOUNT</div>
            <div>PAYMENT METHOD</div>
            <div style={{ textAlign: "right" }}>STATUS</div>
          </div>

          {isLoading ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: C.muted }}>
              <div style={{ width: 30, height: 30, border: `2px solid ${C.accent}40`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <div>Fetching transaction history from database...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <style>{`
                @keyframes highlightRow {
                  0%   { background-color: ${C.accent}40; }
                  100% { background-color: transparent; }
                }
              `}</style>
              {filteredTransactions.map((txn, idx) => (
                <div
                  key={txn.id}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr", padding: "20px 24px", borderBottom: idx === filteredTransactions.length - 1 ? "none" : `1px solid ${C.border}50`, alignItems: "center", transition: "background 0.2s", cursor: "pointer", animation: txn.id === 'TXN-00143' ? 'highlightRow 2s ease-out' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.bg}40`}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: C.muted }}>{txn.id}</div>
                  <div style={{ fontSize: 13, color: C.white }}>{txn.date}</div>
                  <div style={{ fontSize: 13, color: C.white, fontWeight: 500 }}>{txn.desc}</div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, color: C.white }}>{txn.amount}</div>
                  <div style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>💳 {txn.method}</div>
                  <div style={{ textAlign: "right" }}>
                    <Tag color={txn.status === "Paid" ? C.accent : txn.status === "Refunded" ? C.amber : C.red}>{txn.status}</Tag>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div style={{ padding: "60px 24px", textAlign: "center", color: C.muted }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 14 }}>No transactions found for the selected filter.</div>
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<HistoryScreen />);
