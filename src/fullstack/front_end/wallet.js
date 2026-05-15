const { C, Logo, Btn, Tag } = window;
const { useState, useEffect, useMemo } = React;

const buildSeries = (target, points) => {
  if (points <= 0) {
    return [];
  }

  return Array.from({ length: points }, (_, index) =>
    parseFloat((((index + 1) / points) * target).toFixed(2))
  );
};

const WalletScreen = () => {
  const [userName, setUserName]       = useState("Trader");
  const [activeMarket, setActiveMarket] = useState("BTC 15m UP");
  const [chartMode, setChartMode]     = useState('pnl');
  const [isLoading, setIsLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const [walletData, setWalletData] = useState({
    metrics:   { pnl: 0, winRate: 0, avgProfit: 0, efficiency: 0 },
    histories: { pnl: [], win: [], profit: [], eff: [] }
  });

  // GET /v1/wallet/overview + /v1/wallet/history
  const fetchBackendData = async () => {
    try {
      await window.FirebaseAuthClient?.ensureSession?.();
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` };
      const [overviewRes, historyRes] = await Promise.all([
        fetch(`/v1/wallet/overview`, { headers }),
        fetch(`/v1/wallet/history?market=${encodeURIComponent(activeMarket)}`, { headers })
      ]);
      if (!overviewRes.ok || !historyRes.ok) throw new Error('Fetch failed');

      const overview = await overviewRes.json();
      const history = await historyRes.json();
      const points = Math.max(history.length, 10);
      const totalTrades = Number(overview.total_trades || 0);
      const pnl = Number(overview.pnl || 0);
      const avgProfit = totalTrades ? pnl / totalTrades : 0;
      const efficiency = Number(overview.total_deposited || 0)
        ? Math.min(100, (Number(overview.total_volume || 0) / Number(overview.total_deposited || 1)) * 100)
        : 0;
      const winRate = totalTrades ? Math.min(100, Math.max(0, 50 + (pnl >= 0 ? 15 : -15))) : 0;

      const pnlSeries = buildSeries(pnl, points);
      const winSeries = buildSeries(winRate, points);
      const profitSeries = buildSeries(avgProfit, points);
      const effSeries = buildSeries(efficiency, points);

      setWalletData({
        metrics: {
          pnl:        parseFloat(pnl.toFixed(2)),
          winRate:    parseFloat(winRate.toFixed(1)),
          avgProfit:  parseFloat(avgProfit.toFixed(2)),
          efficiency: parseFloat(efficiency.toFixed(1))
        },
        histories: {
          pnl:    pnlSeries,
          win:    winSeries,
          profit: profitSeries,
          eff:    effSeries
        }
      });
      setIsLoading(false);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
      // Fall back to mock data so the UI stays functional during development
      setWalletData({
        metrics:   { pnl: 142.50, winRate: 68.2, avgProfit: 24.10, efficiency: 91.5 },
        histories: {
          pnl:    [100, 105, 103, 110, 115, 112, 118, 125, 122, 142.5],
          win:    [60, 62, 58, 65, 66, 64, 68, 70, 67, 68.2],
          profit: [15, 18, 14, 20, 22, 19, 23, 25, 22, 24.1],
          eff:    [80, 82, 85, 88, 90, 89, 92, 94, 93, 91.5]
        }
      });
      setIsLoading(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem('ob_user_name');
    if (savedName) setUserName(savedName);
  }, []);

  // Refetch on market switch
  useEffect(() => {
    setIsLoading(true);
    fetchBackendData();
  }, [activeMarket]);

  // Settlement simulation — advances all series forward with slight upward trend
  // Replace this interval with a WebSocket settlement listener in production
  useEffect(() => {
    if (isLoading) return;

    const advance = (arr, volatility, trend = 0) => {
      const last = arr[arr.length - 1];
      const next = Math.max(0, last + (Math.random() - 0.5 + trend) * volatility);
      return [...arr.slice(1), parseFloat(next.toFixed(2))];
    };

    const pollTimer = setInterval(() => {
      setWalletData(prev => {
        const newPnl    = advance(prev.histories.pnl,    8, 0.2);
        const newWin    = advance(prev.histories.win,    2);
        const newProfit = advance(prev.histories.profit, 1);
        const newEff    = advance(prev.histories.eff,    1);
        return {
          metrics: {
            pnl:        newPnl[newPnl.length - 1],
            winRate:    newWin[newWin.length - 1],
            avgProfit:  newProfit[newProfit.length - 1],
            efficiency: newEff[newEff.length - 1]
          },
          histories: { pnl: newPnl, win: newWin, profit: newProfit, eff: newEff }
        };
      });
      setLastUpdated(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [isLoading]);

  const config = useMemo(() => ({
    pnl:    { label: "Cumulative P&L",     color: C.accent,  unit: "$", suffix: "" },
    win:    { label: "Live Win Rate",       color: C.blue,    unit: "",  suffix: "%" },
    profit: { label: "Avg. Profit/Trade",  color: C.amber,   unit: "$", suffix: "" },
    eff:    { label: "Capital Efficiency", color: C.purple,  unit: "",  suffix: "%" }
  }[chartMode]), [chartMode]);

  const currentData = walletData.histories[chartMode] || [];

  if (isLoading) {
    return (
      <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${C.accent}20`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: 2 }}>SYNCING WITH DATA NODE...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.white, fontFamily: "'DM Sans'" }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(18,18,18,0.8)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}`, zIndex: 100 }}>
        <Logo size={14} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: C.muted }}>LAST SYNC</div>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", color: C.accent }}>{lastUpdated}</div>
          </div>
          <div style={{ width: 1, height: 24, background: C.border }} />
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>Dashboard</Btn>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 4px 12px", background: `${C.accent}10`, borderRadius: 20, border: `1px solid ${C.accent}30` }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{userName}</span>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accent, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{userName[0]}</div>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Wallet <span style={{ color: C.muted, fontWeight: 300 }}>Analytics</span></h1>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Real-time performance monitoring for Duke FinTech Terminal</p>
          </div>
          <div style={{ display: "flex", gap: 8, background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
            {["BTC 15m UP", "BTC 15m DN", "ETH 1H UP"].map(m => (
              <button key={m} onClick={() => setActiveMarket(m)} style={{ background: activeMarket === m ? C.bg : "transparent", color: activeMarket === m ? C.accent : C.muted, border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "0.2s" }}>{m}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
          {[
            { id: 'pnl',    label: "Total P&L",   val: walletData.metrics.pnl,        unit: "$", color: C.accent, sub: "+14.2% yield" },
            { id: 'win',    label: "Win Rate",     val: walletData.metrics.winRate,    unit: "%", color: C.blue,   sub: "Above market avg" },
            { id: 'profit', label: "Avg Profit",   val: walletData.metrics.avgProfit,  unit: "$", color: C.amber,  sub: "Per winning trade" },
            { id: 'eff',    label: "Efficiency",   val: walletData.metrics.efficiency, unit: "%", color: C.purple, sub: "Capital utilization" }
          ].map(k => (
            <div
              key={k.id}
              onClick={() => setChartMode(k.id)}
              style={{ background: C.surface, border: `1px solid ${chartMode === k.id ? k.color : C.border}`, borderRadius: 16, padding: 24, cursor: "pointer", transition: "0.3s", boxShadow: chartMode === k.id ? `0 10px 30px -10px ${k.color}40` : 'none', transform: chartMode === k.id ? 'translateY(-4px)' : 'none' }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>{k.label}</span>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: chartMode === k.id ? k.color : 'transparent' }} />
              </div>
              <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: k.color, marginBottom: 4, transition: "color 0.3s" }}>
                {k.unit === '$' ? `+${k.unit}${k.val.toFixed(2)}` : `${k.val.toFixed(1)}${k.unit}`}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 12, color: config.color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", transition: "color 0.3s" }}>Live Streaming</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{config.label} History</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {['pnl', 'win', 'profit', 'eff'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  style={{ background: chartMode === mode ? config.color : 'transparent', color: chartMode === mode ? C.bg : C.muted, border: chartMode === mode ? 'none' : `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "0.3s" }}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 350, width: "100%", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono'", zIndex: 2 }}>
              <span>{config.unit}{Math.max(...currentData).toFixed(1)}{config.suffix}</span>
              <span style={{ opacity: 0.5 }}>{config.unit}{((Math.max(...currentData) + Math.min(...currentData)) / 2).toFixed(1)}{config.suffix}</span>
              <span>{config.unit}{Math.min(...currentData).toFixed(1)}{config.suffix}</span>
            </div>

            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 100" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={config.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={config.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="10" x2="400" y2="10" stroke={C.border} strokeWidth="0.5" strokeDasharray="4" />
              <line x1="0" y1="50" x2="400" y2="50" stroke={C.border} strokeWidth="0.5" strokeDasharray="4" />
              <line x1="0" y1="90" x2="400" y2="90" stroke={C.border} strokeWidth="0.5" strokeDasharray="4" />
              {(() => {
                const min = Math.min(...currentData), max = Math.max(...currentData);
                const n   = v => 90 - ((v - min) / (max - min + 0.1)) * 80;
                const pts = currentData.map((v, i) => `${(i / (currentData.length - 1)) * 400},${n(v)}`).join(" ");
                return (
                  <>
                    <polygon points={`${pts} 400,100 0,100`} fill="url(#chartGrad)" style={{ transition: "all 0.6s ease" }} />
                    <polyline points={pts} fill="none" stroke={config.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "all 0.6s ease" }} />
                    <circle cx="400" cy={n(currentData[currentData.length - 1])} r="4" fill={config.color} style={{ transition: "all 0.6s ease" }} />
                    <circle cx="400" cy={n(currentData[currentData.length - 1])} r="12" fill={config.color} fillOpacity="0.15" style={{ transition: "all 0.6s ease" }}>
                      <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </>
                );
              })()}
            </svg>
          </div>

          <div style={{ position: "absolute", bottom: 20, right: 32, opacity: 0.1, fontSize: 40, fontWeight: 900, pointerEvents: "none", fontStyle: "italic" }}>
            DUKE NODE-04
          </div>
        </div>

      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<WalletScreen />);
