const { C, Logo, Btn, Tag } = window;
const { useState, useEffect, useMemo } = React;

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub, controls }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
    <div>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>{title}</div>
      {sub && <div style={{ fontSize: 9, color: C.muted + "99", marginTop: 2 }}>{sub}</div>}
    </div>
    {controls && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{controls}</div>}
  </div>
);

// ─── Price line chart: Mid Price / Theoretical / BTC Strike ──────────────────
const PriceLineChart = ({ midPrice, theoretical, btcStrike, height = 200 }) => {
  const all = [...midPrice, ...theoretical, ...btcStrike];
  const min = Math.min(...all), max = Math.max(...all);
  const n = v => 88 - ((v - min) / (max - min + 0.001)) * 76;
  const pts = arr => arr.map((v, i) => ((i / (arr.length - 1)) * 380 + 10) + "," + n(v)).join(" ");
  const W = 400, H = 100;
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={"0 0 " + W + " " + H} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="midGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} stopOpacity="0.12" />
          <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[10, 30, 50, 70, 90].map(y => <line key={y} x1="10" y1={y} x2="390" y2={y} stroke={C.border} strokeWidth="0.4" />)}
      <line x1="10" y1={n(0.5)} x2="390" y2={n(0.5)} stroke={C.muted} strokeWidth="0.6" strokeDasharray="3 3" />
      <polygon points={pts(midPrice) + " 390," + H + " 10," + H} fill="url(#midGrad)" />
      <polyline points={pts(btcStrike)}    fill="none" stroke={C.amber} strokeWidth="1.2" strokeDasharray="3 2" strokeLinejoin="round" />
      <polyline points={pts(theoretical)}  fill="none" stroke={C.blue}  strokeWidth="1.4" strokeDasharray="5 2" strokeLinejoin="round" />
      <polyline points={pts(midPrice)}     fill="none" stroke={C.accent} strokeWidth="2"  strokeLinejoin="round" />
      <circle cx="390" cy={n(midPrice[midPrice.length-1])}     r="3"   fill={C.accent} />
      <circle cx="390" cy={n(theoretical[theoretical.length-1])} r="2.5" fill={C.blue} />
      <circle cx="390" cy={n(btcStrike[btcStrike.length-1])}   r="2.5" fill={C.amber} />
    </svg>
  );
};

// ─── Depth bar chart: time-windowed, bid/ask bars across 0–1 price axis ───────
const DepthBarChart = ({ bids, asks, midPrice, height = 160 }) => {
  const allSizes = [...bids.map(b => b.size), ...asks.map(a => a.size)];
  const maxSize  = Math.max(...allSizes, 1);
  const W = 400, H = 100;
  const barW = 10;
  const xPos = p => p * W;
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={"0 0 " + W + " " + H} style={{ overflow: "visible" }}>
      {[0, 25, 50, 75, 100].map(y => <line key={y} x1="0" y1={y} x2={W} y2={y} stroke={C.border} strokeWidth="0.4" />)}
      <line x1={xPos(midPrice)} y1="0" x2={xPos(midPrice)} y2={H} stroke={C.muted} strokeWidth="0.8" strokeDasharray="3 2" />
      <text x={xPos(midPrice) + 2} y="8" fontSize="5" fill={C.muted} fontFamily="JetBrains Mono">mid</text>
      {bids.map((b, i) => {
        const bH = (b.size / maxSize) * 80;
        return <rect key={"b"+i} x={xPos(b.price) - barW/2} y={H - bH} width={barW} height={bH} fill={C.blue} opacity="0.75" />;
      })}
      {asks.map((a, i) => {
        const bH = (a.size / maxSize) * 80;
        return <rect key={"a"+i} x={xPos(a.price) - barW/2} y={H - bH} width={barW} height={bH} fill={C.red} opacity="0.75" />;
      })}
      {[0.0, 0.25, 0.5, 0.75, 1.0].map(p => (
        <text key={p} x={xPos(p)} y={H + 8} fontSize="5" fill={C.muted} fontFamily="JetBrains Mono" textAnchor="middle">{p.toFixed(2)}</text>
      ))}
    </svg>
  );
};

// ─── Heatmap: UP vs DN rows, time slots as columns ───────────────────────────
const HeatmapChart = ({ data, upColor, dnColor, upLabel = 'UP', dnLabel = 'DN', height = 120 }) => {
  upColor = upColor || C.accent;
  dnColor = dnColor || C.red;
  const W = 400, H = 100, cellH = 36, pad = 2;
  const cols = data.length;
  const cellW = (W - 24) / cols;
  const hex2 = v => Math.round(v * 200 + 30).toString(16).padStart(2, '0');
  return (
    <svg width="100%" height={height} viewBox={"0 0 " + W + " " + H} style={{ overflow: "visible" }}>
      <text x="0" y={cellH/2+3}           fontSize="7" fill={upColor} fontFamily="JetBrains Mono" fontWeight="700">{upLabel}</text>
      <text x="0" y={cellH+pad+cellH/2+3} fontSize="7" fill={dnColor} fontFamily="JetBrains Mono" fontWeight="700">{dnLabel}</text>
      {data.map((d, i) => {
        const x = i * cellW + 24;
        return (
          <g key={i}>
            <rect x={x+pad} y={0}          width={cellW-pad*2} height={cellH-pad} rx="1" fill={upColor + hex2(d.up)} />
            <text x={x+cellW/2+pad} y={cellH/2+3}           fontSize="5.5" fill={C.white} fontFamily="JetBrains Mono" textAnchor="middle">{d.up.toFixed(2)}</text>
            <rect x={x+pad} y={cellH+pad}  width={cellW-pad*2} height={cellH-pad} rx="1" fill={dnColor + hex2(d.dn)} />
            <text x={x+cellW/2+pad} y={cellH+pad+cellH/2+3}  fontSize="5.5" fill={C.white} fontFamily="JetBrains Mono" textAnchor="middle">{d.dn.toFixed(2)}</text>
            <text x={x+cellW/2+pad} y={H-1} fontSize="5" fill={C.muted} fontFamily="JetBrains Mono" textAnchor="middle">{d.slot}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ─── Data helpers ─────────────────────────────────────────────────────────────
const clamp  = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rng    = (lo, hi) => lo + Math.random() * (hi - lo);

const genPriceSeries = (len, base, vol) =>
  Array.from({ length: len }, () => {
    base = clamp(base + (Math.random() - 0.5) * vol, 0.01, 0.99);
    return parseFloat(base.toFixed(4));
  });

const genBtcStrike = (len) =>
  Array.from({ length: len }, (_, i) => parseFloat((0.25 + i * 0.001).toFixed(4)));

// Generate order book for a given time slot index (simulates time-windowed snapshot)
const genOrderBook = (midP, slotSeed) => {
  const bids = [], asks = [];
  for (let i = 1; i <= 10; i++) {
    bids.push({ price: parseFloat(clamp(midP - i*0.025, 0.01, 0.98).toFixed(3)), size: rng(100, 1000) * (1 + slotSeed * 0.1) });
  }
  for (let i = 1; i <= 10; i++) {
    asks.push({ price: parseFloat(clamp(midP + i*0.025, 0.02, 0.99).toFixed(3)), size: rng(100, 1000) * (1 + slotSeed * 0.1) });
  }
  return { bids, asks };
};

// 15-min time slots
const TIME_SLOTS = ['00:00','00:15','00:30','00:45','01:00','01:15','01:30','01:45','02:00','02:15','02:30','02:45'];

const genHeatmap = () =>
  TIME_SLOTS.map(slot => {
    const strike = parseFloat(rng(0.20, 0.35).toFixed(3));
    const theo   = parseFloat(rng(0.18, 0.38).toFixed(3));
    return {
      slot,
      up:          parseFloat(rng(0.15, 0.75).toFixed(3)),
      dn:          parseFloat(rng(0.15, 0.75).toFixed(3)),
      btcStrikeUp: strike,
      btcStrikeDn: parseFloat((1 - strike).toFixed(3)),
      theoUp:      theo,
      theoDn:      parseFloat((1 - theo).toFixed(3)),
    };
  });

const advanceSeries = (arr, vol) => {
  const next = clamp(arr[arr.length-1] + (Math.random()-0.5)*vol, 0.01, 0.99);
  return arr.slice(1).concat(parseFloat(next.toFixed(4)));
};

// ─── Available datetime periods (replace with real data from backend) ───────────
const PERIOD_OPTIONS = [
  '12/10/2022 00:00', '12/10/2022 00:15', '12/10/2022 00:30', '12/10/2022 00:45',
  '12/10/2022 01:00', '12/10/2022 01:15', '12/10/2022 01:30', '12/10/2022 01:45',
  '12/10/2022 02:00', '12/10/2022 02:15', '12/10/2022 02:30', '12/10/2022 02:45',
  '12/11/2022 00:00', '12/11/2022 00:15', '12/11/2022 00:30', '12/11/2022 00:45',
  '12/11/2022 01:00', '12/11/2022 01:15', '12/11/2022 01:30', '12/11/2022 01:45',
  '12/12/2022 00:00', '12/12/2022 00:15', '12/12/2022 00:30', '12/12/2022 00:45',
];

// ─── Main component ───────────────────────────────────────────────────────────
const TerminalScreen = () => {
  const [userName, setUserName]       = useState("Trader");
  const [activeMarket, setActiveMarket] = useState("BTC-15M-UP");

  // Price chart: 15-min datetime range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");

  // Depth chart: selected time slot index
  const [depthSlot, setDepthSlot] = useState(0);

  // Left panel: shared datetime period for both UP and DN
  const [selectedPeriod, setSelectedPeriod] = useState('12/10/2022 00:00');

  // Heatmap: which dataset to show
  const [hmStrikeMode, setHmStrikeMode] = useState('strike');  // 'strike' | 'theoretical'
  const [hmTheoMode,   setHmTheoMode]   = useState('theoretical');

  const N = 48;

  const freshData = () => {
    const mid = 0.25 + Math.random() * 0.15;
    return {
      midPrice:    genPriceSeries(N, mid, 0.015),
      theoretical: genPriceSeries(N, mid + 0.02, 0.012),
      btcStrike:   genBtcStrike(N),
      // one order book snapshot per time slot
      depthBySlot: TIME_SLOTS.map((_, si) => genOrderBook(mid + (si-6)*0.003, si)),
      heatmap:     genHeatmap(),
      spread:      parseFloat(rng(1.5, 4.5).toFixed(2)),
      vol:         parseFloat(rng(28, 55).toFixed(1)),
      vpin:        parseFloat(rng(0.28, 0.72).toFixed(3)),
    };
  };

  const [mkt, setMkt] = useState(freshData);

  useEffect(() => {
    const saved = localStorage.getItem('ob_user_name');
    if (saved) setUserName(saved);
  }, []);

  // Stream price series every 3s
  useEffect(() => {
    const t = setInterval(() => {
      setMkt(prev => {
        const newMid  = advanceSeries(prev.midPrice, 0.015);
        const newTheo = advanceSeries(prev.theoretical, 0.012);
        const mid = newMid[N-1];
        return {
          ...prev,
          midPrice:    newMid,
          theoretical: newTheo,
          depthBySlot: prev.depthBySlot.map((_, si) => genOrderBook(mid + (si-6)*0.003, si)),
          spread: parseFloat((Math.abs(newMid[N-1] - newTheo[N-1]) * 100 + 1.5).toFixed(2)),
          vpin:   clamp(prev.vpin + (Math.random()-0.5)*0.03, 0.1, 0.95),
        };
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Refresh heatmap every 15s
  useEffect(() => {
    const t = setInterval(() => setMkt(prev => ({ ...prev, heatmap: genHeatmap() })), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setMkt(freshData()); }, [activeMarket, selectedPeriod]);

  // L2 order book (right panel, real-time)
  const l2Book = useMemo(() => {
    const mid = mkt.midPrice[N-1];
    const btcMid = 67420 + (mid - 0.25) * 1000;
    const gen = (base, count, isAsk) =>
      Array.from({ length: count }).map((_, i) => ({
        price: isAsk ? base + i*0.5 : base - i*0.5,
        size:  (Math.random()*2+0.1).toFixed(3),
        total: (Math.random()*10+5).toFixed(1),
        depthPct: Math.floor(Math.random()*80)+5
      }));
    return { btcMid, asks: gen(btcMid+0.5, 8, true).reverse(), bids: gen(btcMid-0.5, 8, false) };
  }, [Math.floor(mkt.midPrice[N-1] * 1000)]);

  const mid = mkt.midPrice[N-1];
  const vpinAlert = mkt.vpin >= 0.7;
  const currentDepth = mkt.depthBySlot[depthSlot] || mkt.depthBySlot[0];

  const contracts = ['BTC-15M-UP', 'BTC-15M-DN'];

  const TabToggle = ({ options, value, onChange }) => (
    <div style={{ display: "flex", gap: 2, background: C.bg, padding: 3, borderRadius: 6, border: "1px solid " + C.border }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{ background: value === o.id ? C.surface : "transparent", color: value === o.id ? C.white : C.muted, border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 9, cursor: "pointer", fontWeight: 600, fontFamily: "'JetBrains Mono'", transition: "0.15s" }}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.white, fontFamily: "'JetBrains Mono'" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: C.surface, borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Logo size={12} />
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ fontSize: 11, color: C.accent }}>● LIVE FEED</div>
          <div style={{ fontSize: 11, color: C.muted }}>BTC 15-MIN PREDICTION MARKET</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, textAlign: "right" }}>
            <div style={{ color: C.muted }}>LATENCY</div>
            <div style={{ color: C.accent }}>1.42ms</div>
          </div>
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>EXIT</Btn>
          <div style={{ padding: "4px 10px", background: C.bg, borderRadius: 4, border: "1px solid " + C.border, fontSize: 11 }}>ID: {userName.toUpperCase()}</div>
        </div>
      </nav>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "200px 1fr 280px", gap: 1, background: C.border, overflow: "hidden" }}>

        {/* Left — contracts + time range selector + KPIs + execute */}
        <aside style={{ background: C.bg, display: "flex", flexDirection: "column", gap: 0, overflowY: "auto" }}>

          {/* Contract selector */}
          <div style={{ padding: 14, borderBottom: "1px solid " + C.border }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 10 }}>BTC 15-MIN CONTRACTS</div>

            {/* Shared datetime period selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 2 }}>SELECT PERIOD</div>
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                style={{ width: "100%", background: C.surface, border: "1px solid " + C.accent + "60", color: C.white, borderRadius: 6, padding: "7px 8px", fontSize: 10, outline: "none", fontFamily: "'JetBrains Mono'", cursor: "pointer" }}
              >
                {PERIOD_OPTIONS.map(p => (
                  <option key={p} value={p} style={{ background: C.surface, color: C.white }}>{p}</option>
                ))}
              </select>
              <div style={{ fontSize: 8, color: C.accent, textAlign: "right", marginTop: 1 }}>
                {selectedPeriod}
              </div>
            </div>

            {/* UP / DN buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contracts.map(m => {
                const isUp = m.includes('UP');
                const col = isUp ? C.accent : C.red;
                return (
                  <div key={m} onClick={() => setActiveMarket(m)}
                    style={{ padding: 10, borderRadius: 6, border: "1px solid " + (activeMarket === m ? col : 'transparent'), background: activeMarket === m ? col + "12" : C.surface, cursor: "pointer", transition: "0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{m}</span>
                      <span style={{ fontSize: 9, color: col, background: col + "20", padding: "1px 5px", borderRadius: 3 }}>{isUp ? 'UP' : 'DN'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: col, fontWeight: 700 }}>{(isUp ? mid : 1 - mid).toFixed(3)} <span style={{ fontSize: 9, color: C.muted }}>¢</span></div>
                    <div style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>Vol: $1.2M · 15-min</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KPIs */}
          <div style={{ padding: 14, borderBottom: "1px solid " + C.border, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 2 }}>MARKET METRICS</div>
            {[
              { label: "MID PRICE",        val: mid.toFixed(4),          color: C.accent },
              { label: "THEORETICAL",      val: mkt.theoretical[N-1].toFixed(4), color: C.blue },
              { label: "BTC STRIKE",       val: mkt.btcStrike[N-1].toFixed(4),   color: C.amber },
              { label: "SPREAD (BPS)",     val: mkt.spread,              color: C.white },
              { label: "REALIZED VOL",     val: mkt.vol + "%",           color: C.purple },
              { label: "VPIN",             val: mkt.vpin.toFixed(3),     color: vpinAlert ? C.red : C.amber },
            ].map(k => (
              <div key={k.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 8, color: C.muted }}>{k.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: k.color }}>{k.val}</span>
              </div>
            ))}
            {vpinAlert && <div style={{ fontSize: 8, color: C.red, background: C.red + "15", padding: "4px 8px", borderRadius: 4, textAlign: "center" }}>⚠ VPIN ELEVATED</div>}
          </div>

        </aside>

        {/* Center — all charts stacked vertically */}
        <main style={{ background: C.bg, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── 1. Price Chart ── */}
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "16px 18px" }}>
            <SectionHeader
              title="PRICE CHART · BTC 15-MIN"
              sub={"Mid Price vs Theoretical vs BTC Strike · " + activeMarket + " · " + selectedPeriod}
              controls={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: C.muted }}>WINDOW:</span>
                  <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)}
                    style={{ background: C.bg, color: C.text, border: "1px solid " + C.border, borderRadius: 4, padding: "3px 6px", fontSize: 9, outline: "none", fontFamily: "'JetBrains Mono'" }} />
                  <span style={{ color: C.muted, fontSize: 9 }}>–</span>
                  <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)}
                    style={{ background: C.bg, color: C.text, border: "1px solid " + C.border, borderRadius: 4, padding: "3px 6px", fontSize: 9, outline: "none", fontFamily: "'JetBrains Mono'" }} />
                </div>
              }
            />
            <div style={{ display: "flex", gap: 16, fontSize: 9, marginBottom: 10 }}>
              <span style={{ color: C.accent }}>— Mid Price</span>
              <span style={{ color: C.blue }}>- - Theoretical</span>
              <span style={{ color: C.amber }}>-- BTC Strike</span>
              <span style={{ color: C.muted }}>· · 0.5 ref</span>
            </div>
            <PriceLineChart midPrice={mkt.midPrice} theoretical={mkt.theoretical} btcStrike={mkt.btcStrike} height={200} />
          </div>

          {/* ── 2. Depth Chart ── */}
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "16px 18px" }}>
            <SectionHeader
              title="ORDER BOOK DEPTH · PRICE 0.00 – 1.00"
              sub={"Snapshot at: " + TIME_SLOTS[depthSlot] + " · " + activeMarket}
              controls={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: C.muted }}>TIME SLOT:</span>
                  <input type="range" min="0" max={TIME_SLOTS.length - 1} step="1" value={depthSlot}
                    onChange={e => setDepthSlot(parseInt(e.target.value))}
                    style={{ width: 120, accentColor: C.accent }} />
                  <span style={{ fontSize: 10, color: C.accent, minWidth: 40 }}>{TIME_SLOTS[depthSlot]}</span>
                  <button onClick={() => setDepthSlot(0)}
                    style={{ background: "transparent", border: "1px solid " + C.border, color: C.muted, borderRadius: 4, padding: "3px 8px", fontSize: 9, cursor: "pointer", fontFamily: "'JetBrains Mono'" }}>
                    Reset
                  </button>
                </div>
              }
            />
            <div style={{ display: "flex", gap: 16, fontSize: 9, marginBottom: 10 }}>
              <span style={{ color: C.blue }}>█ Bid</span>
              <span style={{ color: C.red }}>█ Ask</span>
              <span style={{ color: C.muted }}>| Mid: {mid.toFixed(3)}</span>
              <span style={{ color: C.muted }}>
                Bid depth: {currentDepth.bids.reduce((s, b) => s + b.size, 0).toFixed(0)}
                {" · Ask depth: "}{currentDepth.asks.reduce((s, a) => s + a.size, 0).toFixed(0)}
              </span>
            </div>
            <DepthBarChart bids={currentDepth.bids} asks={currentDepth.asks} midPrice={mid} height={160} />
          </div>

          {/* ── 3. Heatmap: Strike vs BTC ── */}
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "16px 18px" }}>
            <SectionHeader
              title="HEATMAP · STRIKE vs BTC PRICE"
              sub="BTC Strike UP / DN component by 15-min time slot"
              controls={
                <TabToggle
                  options={[{ id: 'strike', label: 'Strike' }, { id: 'mid', label: 'Mid Price' }]}
                  value={hmStrikeMode}
                  onChange={setHmStrikeMode}
                />
              }
            />
            <div style={{ display: "flex", gap: 16, fontSize: 9, marginBottom: 10 }}>
              {hmStrikeMode === 'strike' ? (
                <><span style={{ color: C.accent }}>█ Strike UP</span><span style={{ color: C.red }}>█ Strike DN</span></>
              ) : (
                <><span style={{ color: C.accent }}>█ Mid Price UP</span><span style={{ color: C.red }}>█ Mid Price DN</span></>
              )}
              <span style={{ color: C.muted }}>· Brighter = higher value</span>
            </div>
            <HeatmapChart
              data={mkt.heatmap.map(d => hmStrikeMode === 'strike'
                ? { slot: d.slot, up: d.btcStrikeUp, dn: d.btcStrikeDn }
                : { slot: d.slot, up: d.up, dn: d.dn }
              )}
              height={120}
              upLabel={hmStrikeMode === 'strike' ? 'STRIKE UP' : 'MID UP'}
              dnLabel={hmStrikeMode === 'strike' ? 'STRIKE DN' : 'MID DN'}
            />
          </div>

          {/* ── 4. Heatmap: Theoretical Price ── */}
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "16px 18px" }}>
            <SectionHeader
              title="HEATMAP · THEORETICAL PRICE"
              sub="Theoretical UP / DN token price by 15-min time slot"
              controls={
                <TabToggle
                  options={[{ id: 'theoretical', label: 'Theoretical' }, { id: 'spread', label: 'vs Mid Spread' }]}
                  value={hmTheoMode}
                  onChange={setHmTheoMode}
                />
              }
            />
            <div style={{ display: "flex", gap: 16, fontSize: 9, marginBottom: 10 }}>
              {hmTheoMode === 'theoretical' ? (
                <><span style={{ color: C.blue }}>█ Theo UP</span><span style={{ color: C.purple }}>█ Theo DN</span></>
              ) : (
                <><span style={{ color: C.blue }}>█ UP spread</span><span style={{ color: C.purple }}>█ DN spread</span></>
              )}
              <span style={{ color: C.muted }}>· Brighter = higher value</span>
            </div>
            <HeatmapChart
              data={mkt.heatmap.map(d => hmTheoMode === 'theoretical'
                ? { slot: d.slot, up: d.theoUp, dn: d.theoDn }
                : { slot: d.slot, up: Math.abs(d.theoUp - d.up), dn: Math.abs(d.theoDn - d.dn) }
              )}
              height={120}
              upColor={C.blue}
              dnColor={C.purple}
              upLabel={hmTheoMode === 'theoretical' ? 'THEO UP' : 'SPREAD UP'}
              dnLabel={hmTheoMode === 'theoretical' ? 'THEO DN' : 'SPREAD DN'}
            />
          </div>

        </main>

        {/* Right — L2 order book */}
        <aside style={{ background: C.surface, display: "flex", flexDirection: "column", borderLeft: "1px solid " + C.border, overflowY: "auto" }}>
          <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 10, letterSpacing: 1 }}>ORDER BOOK (L2)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 9, color: C.muted, paddingBottom: 6 }}>
              <span>PRICE</span><span style={{ textAlign: "right" }}>SIZE</span><span style={{ textAlign: "right" }}>TOTAL</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column-reverse" }}>
              {l2Book.asks.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, padding: "3px 0", position: "relative" }}>
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, background: C.red + "15", width: a.depthPct + "%" }} />
                  <span style={{ color: C.red }}>{a.price.toFixed(1)}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{a.size}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{a.total}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 0", margin: "6px 0", borderTop: "1px solid " + C.border, borderBottom: "1px solid " + C.border, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{l2Book.btcMid.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: C.muted }}>BTC/USD ORACLE</div>
            </div>
            <div>
              {l2Book.bids.map((b, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, padding: "3px 0", position: "relative" }}>
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, background: C.accent + "15", width: b.depthPct + "%" }} />
                  <span style={{ color: C.accent }}>{b.price.toFixed(1)}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{b.size}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{b.total}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<TerminalScreen />);