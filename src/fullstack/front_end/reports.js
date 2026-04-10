const { C, Logo, Btn, Tag } = window;
const { useState, useEffect } = React;

// Static template config — no API needed
const templates = [
  { id: 'performance', name: 'Performance Report',      desc: 'Gain, trade quality, and return metrics across all markets.',                             icon: '📈' },
  { id: 'orderbook',   name: 'Order Book Snapshot',     desc: 'Historical order book depth and spread analysis for a selected time range.',              icon: '📖' },
  { id: 'activity',    name: 'Market Activity Report',  desc: 'Volume, liquidity, and price movement across Polymarket contracts.',                      icon: '🌐' },
  { id: 'risk',        name: 'Risk & Exposure Report',  desc: 'Capital allocation, drawdown, position concentration, and risk-adjusted returns.',        icon: '⚠️' }
];

const ReportingScreen = () => {
  const [userName, setUserName]               = useState("Trader");
  const [selectedTemplate, setSelectedTemplate] = useState('performance');
  const [exportFormat, setExportFormat]       = useState('PDF');
  const [isLoading, setIsLoading]             = useState(true);
  const [isGenerating, setIsGenerating]       = useState(false);
  const [metrics, setMetrics]                 = useState({ pnl: "+$0", winRate: "0%", volume: "$0", generated: "0" });
  const [scheduledReports, setScheduledReports] = useState([]);

  useEffect(() => {
    const savedName = localStorage.getItem('ob_user_name');
    if (savedName) setUserName(savedName);
  }, []);

  // GET /v1/reports/metrics + GET /v1/reports/scheduled — load dashboard KPIs and active schedule list
  useEffect(() => {
    const fetchReportData = async () => {
      // try {
      //   const headers = { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` };
      //   const [metricsRes, scheduledRes] = await Promise.all([
      //     fetch('https://api.yourbackend.com/v1/reports/metrics', { headers }),
      //     fetch('https://api.yourbackend.com/v1/reports/scheduled', { headers })  // endpoint not in API table — confirm with backend
      //   ]);
      //   setMetrics(await metricsRes.json());
      //   setScheduledReports(await scheduledRes.json());
      //   setIsLoading(false);
      // } catch (err) { console.error(err); }

      setTimeout(() => {
        setMetrics({ pnl: "+$1,840", winRate: "72.4%", volume: "$18,200", generated: "23" });
        setScheduledReports([
          { name: 'Weekly P&L Summary',       schedule: 'Every Monday',     status: 'ACTIVE', color: C.accent },
          { name: 'Daily Order Book Snap',    schedule: 'Every day 23:59',  status: 'ACTIVE', color: C.accent },
          { name: 'Monthly Risk Digest',      schedule: '1st of month',     status: 'PAUSED', color: C.amber }
        ]);
        setIsLoading(false);
      }, 800);
    };

    fetchReportData();
  }, []);

  // POST /v1/reports/generate — submit report job; response returns a signed download URL
  const handleGenerate = async () => {
    setIsGenerating(true);

    // try {
    //   const res = await fetch('https://api.yourbackend.com/v1/reports/generate', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
    //     body: JSON.stringify({ template: selectedTemplate, format: exportFormat, dateRange: { start: '2026-03-13', end: '2026-03-20' }, market: 'All' })
    //   });
    //   const data = await res.json();
    //   window.open(data.downloadUrl);
    // } catch (err) { console.error(err); }
    // finally { setIsGenerating(false); }

    setTimeout(() => {
      alert(`[Demo] ${exportFormat} ${templates.find(t => t.id === selectedTemplate).name} generated successfully!\nQuerying 20GB+ tick data from AWS S3...`);
      setIsGenerating(false);
    }, 1500);
  };

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

      <main style={{ flex: 1, padding: "32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Reports & Exports</h1>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <Tag color={C.accent}>FREEMIUM ACCESS</Tag>
            <span style={{ color: C.muted, fontSize: 12 }}>Duke FinTech Data Node v2.0</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
          {[
            { label: "TOTAL P&L",          val: metrics.pnl,       sub: "Last 30 days",         color: C.accent },
            { label: "AVG. WIN RATE",       val: metrics.winRate,   sub: "Across all markets",   color: C.blue },
            { label: "TOTAL VOLUME",        val: metrics.volume,    sub: "Last 7 days",           color: C.amber },
            { label: "REPORTS GENERATED",  val: metrics.generated, sub: "This month",            color: C.purple }
          ].map(k => (
            <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: k.color }}>
                {isLoading ? "..." : k.val}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}>

          <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Generate Report</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Choose a template, configure options, and export.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{ padding: 20, borderRadius: 12, border: `1px solid ${selectedTemplate === t.id ? C.accent : C.border}`, background: selectedTemplate === t.id ? `${C.accent}08` : C.bg, cursor: "pointer", transition: "0.2s" }}
                >
                  <div style={{ fontSize: 20, marginBottom: 12 }}>{t.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: selectedTemplate === t.id ? C.accent : C.white }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 10, color: C.muted, display: "block", marginBottom: 8 }}>MARKET SELECTION</label>
                <select style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.white, padding: 12, borderRadius: 8, outline: "none" }}>
                  <option>All Markets</option>
                  <option>Polymarket BTC 15-min Up/Down</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.muted, display: "block", marginBottom: 8 }}>DATE RANGE</label>
                <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: C.white }}>
                  Mar 13, 2026 - Mar 20, 2026
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.muted, display: "block", marginBottom: 8 }}>EXPORT FORMAT</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {['PDF', 'CSV', 'JSON'].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      style={{ flex: 1, padding: 10, background: exportFormat === fmt ? C.accent : C.bg, border: `1px solid ${exportFormat === fmt ? C.accent : C.border}`, borderRadius: 6, fontSize: 10, color: exportFormat === fmt ? C.bg : C.muted, fontWeight: 700, cursor: "pointer" }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Btn fullWidth style={{ marginTop: 32, padding: 16, fontSize: 14 }} onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Data Node is compiling massive records..." : `Download ${exportFormat} Report →`}
            </Btn>
          </section>

          <aside style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Scheduled Reports</h3>
              <button style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>+ New</button>
            </div>

            {isLoading ? (
              <div style={{ padding: "20px", textAlign: "center", color: C.muted, fontSize: 12 }}>Loading schedules...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {scheduledReports.map((r, i) => (
                  <div key={i} style={{ padding: 16, background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                      <Tag color={r.color}>{r.status}</Tag>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>Frequency: <span style={{ color: C.white }}>{r.schedule}</span></div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 32, padding: 16, background: `${C.blue}08`, borderRadius: 12, border: `1px dashed ${C.blue}40` }}>
              <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 4 }}>Storage Policy</div>
              <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                Tick-level data requires roughly ~20 GB/day storage.
              </p>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<ReportingScreen />);