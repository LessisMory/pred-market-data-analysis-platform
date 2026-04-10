const { C, Logo, Btn, Tag } = window;
const { useState, useEffect } = React;

const plans = [
  {
    id: 'free', name: 'FREE', price: 0, badge: null, color: C.muted,
    features: [
      { name: 'Dashboard overview',       active: true  },
      { name: 'Live BTC/USD price feed',  active: true  },
      { name: 'Basic order book view',    active: true  },
      { name: 'Historical replay',        active: false },
      { name: 'Depth charts',             active: false },
      { name: 'Market analytics',         active: false },
      { name: 'CSV data export',          active: false },
      { name: 'API access',               active: false }
    ]
  },
  {
    id: 'pro', name: 'PRO', price: 9.99, badge: 'MOST POPULAR', color: C.accent,
    features: [
      { name: 'Everything in Free',               active: true  },
      { name: 'Full historical replay',           active: true  },
      { name: 'Depth charts (tick, 1s, 5s)',      active: true  },
      { name: '15-min binary option feed',        active: true  },
      { name: 'Market analytics dashboard',       active: true  },
      { name: 'CSV data export',                  active: true  },
      { name: 'API access',                       active: false },
      { name: 'Custom market tracking',           active: false }
    ]
  },
  {
    id: 'elite', name: 'ELITE', price: 29.99, badge: 'FULL ACCESS', color: C.amber,
    features: [
      { name: 'Everything in Pro',          active: true },
      { name: 'REST & WebSocket API',       active: true },
      { name: 'Custom market tracking',     active: true },
      { name: 'Priority data ingestion',    active: true },
      { name: 'Backtesting engine access',  active: true },
      { name: 'Unlimited data export',      active: true },
      { name: 'Dedicated support',          active: true },
      { name: 'Early feature access',       active: true }
    ]
  }
];

const MembershipScreen = () => {
  const [userName, setUserName]         = useState("Trader");
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('pro');

  useEffect(() => {
    const savedName = localStorage.getItem('ob_user_name');
    if (savedName) setUserName(savedName);
  }, []);

  // POST /v1/billing/subscribe — submit plan selection and billing cycle, redirect on success
  const handleSubscribe = async () => {
    // try {
    //   const res = await fetch('https://api.yourbackend.com/v1/billing/subscribe', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
    //     body: JSON.stringify({ planId: selectedPlan, cycle: billingCycle })
    //   });
    //   if (res.ok) {
    //     alert(`Successfully subscribed to ${plans.find(p => p.id === selectedPlan).name} Plan!`);
    //     window.location.href = 'menu.html';
    //   } else { alert("Payment failed or invalid request."); }
    // } catch (err) { console.error(err); }

    alert(`[Demo] Successfully subscribed to ${plans.find(p => p.id === selectedPlan).name} Plan!`);
    window.location.href = 'menu.html';
  };

  const getPrice = (plan) =>
    billingCycle === 'annual' && plan.price > 0 ? (plan.price * 0.8).toFixed(2) : plan.price;

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

      <main style={{ flex: 1, padding: "48px 32px", maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Upgrade Your Plan</div>
          <h1 style={{ fontSize: 40, fontWeight: 300, margin: "0 0 16px 0" }}>
            Choose the right plan<br />
            <span style={{ color: C.accent, fontWeight: 700 }}>for your strategy</span>
          </h1>
          <p style={{ color: C.muted, fontSize: 15, maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
            Unlock real-time data replay, depth analysis, and full market access.
          </p>

          <div style={{ display: "inline-flex", background: C.surface, padding: 4, borderRadius: 24, border: `1px solid ${C.border}`, marginTop: 32 }}>
            <button onClick={() => setBillingCycle('monthly')} style={{ background: billingCycle === 'monthly' ? C.accent : 'transparent', color: billingCycle === 'monthly' ? C.bg : C.muted, border: "none", borderRadius: 20, padding: "8px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "0.2s" }}>
              Monthly
            </button>
            <button onClick={() => setBillingCycle('annual')} style={{ background: billingCycle === 'annual' ? C.accent : 'transparent', color: billingCycle === 'annual' ? C.bg : C.muted, border: "none", borderRadius: 20, padding: "8px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", gap: 6 }}>
              Annual <span style={{ background: `${C.accent}30`, color: billingCycle === 'annual' ? C.bg : C.accent, padding: "2px 6px", borderRadius: 4, fontSize: 9 }}>2 MONTHS FREE</span>
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, width: "100%", marginBottom: 48 }}>
          {plans.map(plan => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{ background: C.surface, border: `2px solid ${isSelected ? plan.color : C.border}`, borderRadius: 24, padding: 32, cursor: "pointer", position: "relative", transition: "all 0.3s ease", transform: isSelected ? 'translateY(-8px)' : 'none', boxShadow: isSelected ? `0 20px 40px -10px ${plan.color}30` : 'none' }}
              >
                {plan.badge && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.color, color: C.bg, fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 12, letterSpacing: 1 }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ textAlign: "center", marginBottom: 32, borderBottom: `1px solid ${C.border}`, paddingBottom: 24 }}>
                  <div style={{ fontSize: 12, color: C.muted, letterSpacing: 2, marginBottom: 16 }}>{plan.name}</div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 48, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: isSelected ? plan.color : C.white }}>
                      ${getPrice(plan)}
                    </span>
                    <span style={{ color: C.muted, fontSize: 14 }}>/ month</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {plan.features.map((feat, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: feat.active ? 1 : 0.3 }}>
                      <div style={{ color: feat.active ? plan.color : C.muted, fontSize: 14 }}>{feat.active ? '✓' : '✕'}</div>
                      <span style={{ fontSize: 13, color: feat.active ? C.white : C.muted, textDecoration: feat.active ? 'none' : 'line-through' }}>{feat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ width: "100%", background: C.surface, border: `1px solid ${C.accent}50`, borderRadius: 16, padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 10px 30px ${C.accent}15` }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>SELECTED PLAN</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              <span style={{ color: C.accent }}>{plans.find(p => p.id === selectedPlan).name}</span>
              <span style={{ fontFamily: "'JetBrains Mono'", marginLeft: 8 }}>${getPrice(plans.find(p => p.id === selectedPlan))} / month</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Billed {billingCycle}. Cancel anytime.</div>
          </div>

          {selectedPlan !== 'free' ? (
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.bg, padding: "12px 16px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 18 }}>💳</span>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, color: C.muted }}>**** **** **** <span style={{ color: C.white }}>4242</span></div>
                <div style={{ width: 1, height: 16, background: C.border, margin: "0 8px" }} />
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.muted }}>07 / 28</div>
                <div style={{ width: 1, height: 16, background: C.border, margin: "0 8px" }} />
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.muted }}>CVC ***</div>
              </div>
              <Btn style={{ padding: "16px 32px", fontSize: 16 }} onClick={handleSubscribe}>Subscribe →</Btn>
            </div>
          ) : (
            <Btn style={{ padding: "16px 32px", fontSize: 16 }} onClick={() => window.location.href = 'menu.html'}>
              Continue with Free
            </Btn>
          )}
        </div>

      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<MembershipScreen />);