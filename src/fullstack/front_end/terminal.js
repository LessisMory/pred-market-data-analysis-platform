const { C, Logo, Btn, Tag } = window;
const { useState, useEffect, useMemo } = React;

const TerminalScreen = () => {
  const [userName, setUserName]       = useState("Trader");
  const [activeMarket, setActiveMarket] = useState("BTC-15M-UP");
  const [activeContracts]             = useState(['BTC-15M-UP', 'BTC-15M-DN', 'ETH-1H-UP', 'SOL-5M-DN']);
  const [price, setPrice]             = useState(67420.50);
  const [orderSize, setOrderSize]     = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [timeframe, setTimeframe]     = useState('1D');
  const [showArea, setShowArea]       = useState(true);
  const [showLine, setShowLine]       = useState(true);
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem('ob_user_name');
    if (savedName) setUserName(savedName);
  }, []);

  // Live price ticker — resets interval when active market switches
  useEffect(() => {
    const timer = setInterval(() => {
      setPrice(prev => +(prev + (Math.random() - 0.45) * 5).toFixed(2));
    }, 2000);
    return () => clearInterval(timer);
  }, [activeMarket]);

  // Order book — recalculates on integer price tick, depth widths baked into memo to avoid per-render flicker
  const orderBook = useMemo(() => {
    const generateLevels = (base, count, isAsk) =>
      Array.from({ length: count }).map((_, i) => ({
        price: isAsk ? base + (i * 0.5) : base - (i * 0.5),
        size:  (Math.random() * 2 + 0.1).toFixed(3),
        total: (Math.random() * 10 + 5).toFixed(1),
        depthPct: Math.floor(Math.random() * 80) + 5
      }));
    return {
      asks: generateLevels(price + 0.5, 8, true).reverse(),
      bids: generateLevels(price - 0.5, 8, false)
    };
  }, [Math.floor(price)]);

  const [chartData, setChartData] = useState(() => Array.from({ length: 40 }, () => 50 + Math.random() * 20));

  // Chart streaming — pushes a new point every 3 s
  useEffect(() => {
    const t = setInterval(() => {
      setChartData(prev => [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.5) * 5]);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Reload chart data when timeframe, market, or custom date range changes
  useEffect(() => {
    setChartData(Array.from({ length: 40 }, () => 50 + Math.random() * 20));
  }, [timeframe, activeMarket, startDate, endDate]);

  // POST /v1/orders/execute — submit order payload { market, size, type } to matching engine
  const handlePlaceOrder = async () => {
    if (!orderSize || isNaN(orderSize) || Number(orderSize) <= 0) {
      return alert("Please enter a valid order size.");
    }
    setIsExecuting(true);

    // try {
    //   const res = await fetch('https://api.yourbackend.com/v1/orders/execute', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` },
    //     body: JSON.stringify({ market: activeMarket, size: Number(orderSize), type: 'market' })
    //   });
    //   const data = await res.json();
    //   alert(`Order filled at ${data.fillPrice}`);
    //   setOrderSize("");
    // } catch (err) { console.error(err); }
    // finally { setIsExecuting(false); }

    setTimeout(() => {
      alert(`[Demo] Order filled!\nRouted $${orderSize} on ${activeMarket} at Market Price.`);
      setOrderSize("");
      setIsExecuting(false);
    }, 600);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.white, fontFamily: "'JetBrains Mono'" }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Logo size={12} />
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ fontSize: 11, color: C.accent }}>● LIVE FEED</div>
          <div style={{ fontSize: 11, color: C.muted }}>INDEX: <span style={{ color: C.white }}>BTC/USD</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, textAlign: "right" }}>
            <div style={{ color: C.muted }}>LATENCY</div>
            <div style={{ color: C.accent }}>1.42ms</div>
          </div>
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>EXIT</Btn>
          <div style={{ padding: "4px 10px", background: C.bg, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }}>
            ID: {userName.toUpperCase()}
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr 320px", gap: 1, background: C.border, overflow: "hidden" }}>

        {/* Left — contract selector */}
        <aside style={{ background: C.bg, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>ACTIVE CONTRACTS</div>
          {activeContracts.map(m => (
            <div
              key={m}
              onClick={() => setActiveMarket(m)}
              style={{ padding: "12px", borderRadius: 6, border: `1px solid ${activeMarket === m ? C.accent : 'transparent'}`, background: activeMarket === m ? `${C.accent}10` : C.surface, cursor: "pointer", transition: "0.2s" }}
            >
              <div style={{ fontSize: 12, fontWeight: 700 }}>{m}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: C.muted }}>Vol: $1.2M</span>
                <span style={{ fontSize: 10, color: C.accent }}>+2.4%</span>
              </div>
            </div>
          ))}
        </aside>

        {/* Center — price header + chart */}
        <main style={{ background: C.bg, display: "flex", flexDirection: "column" }}>

          <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", gap: 40, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>MARKET PRICE</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.white }}>${price.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>24H CHANGE</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.accent }}>+$1,240.50 (+1.82%)</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Tag color={C.accent}>INSTITUTIONAL GRADE FEED</Tag>
            </div>
          </div>

          <div style={{ flex: 1, padding: "24px 32px", display: "flex", flexDirection: "column" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {/* Preset timeframe selector */}
                <div style={{ display: "flex", gap: 4, background: C.surface, padding: 4, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  {['1H', '1D', '1W', '1M', 'ALL'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => { setTimeframe(tf); setStartDate(""); setEndDate(""); }}
                      style={{ background: timeframe === tf ? C.bg : "transparent", color: timeframe === tf ? C.white : C.muted, border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, transition: "0.15s", fontFamily: "'JetBrains Mono'" }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                <div style={{ width: 1, height: 16, background: C.border }} />

                {/* Custom date/time range */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: C.muted }}>CUSTOM:</span>
                  <input
                    type="datetime-local" value={startDate}
                    onChange={e => { setStartDate(e.target.value); setTimeframe("CUSTOM"); }}
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, outline: "none", fontFamily: "'JetBrains Mono'", cursor: "pointer" }}
                  />
                  <span style={{ color: C.muted, fontSize: 10 }}>to</span>
                  <input
                    type="datetime-local" value={endDate}
                    onChange={e => { setEndDate(e.target.value); setTimeframe("CUSTOM"); }}
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, outline: "none", fontFamily: "'JetBrains Mono'", cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* Chart style toggles */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowArea(!showArea)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: showArea ? C.accent : C.muted, borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600, transition: "0.2s" }}>
                  {showArea ? '▣ Area: On' : '□ Area: Off'}
                </button>
                <button onClick={() => setShowLine(!showLine)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: showLine ? C.white : C.muted, borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600, transition: "0.2s" }}>
                  {showLine ? '〰 Line: On' : '〰 Line: Off'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 100" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.accent} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={C.border} strokeWidth="0.5" />)}
                {(() => {
                  const min = Math.min(...chartData), max = Math.max(...chartData);
                  const n   = v => 90 - ((v - min) / (max - min + 1)) * 80;
                  const pts = chartData.map((v, i) => `${(i / (chartData.length - 1)) * 400},${n(v)}`).join(" ");
                  return (
                    <>
                      {showArea && <polygon points={`${pts} 400,100 0,100`} fill="url(#chartFill)" style={{ transition: "all 0.3s" }} />}
                      {showLine && <polyline points={pts} fill="none" stroke={C.accent} strokeWidth="2" strokeLinejoin="round" style={{ transition: "all 0.3s" }} />}
                      {(showLine || showArea) && <circle cx="400" cy={n(chartData[chartData.length - 1])} r="3.5" fill={C.accent} />}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </main>

        {/* Right — order book + execution panel */}
        <aside style={{ background: C.surface, display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}` }}>

          <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 12, letterSpacing: 1 }}>ORDER BOOK (L2)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 9, color: C.muted, paddingBottom: 8 }}>
              <span>PRICE</span>
              <span style={{ textAlign: "right" }}>SIZE</span>
              <span style={{ textAlign: "right" }}>TOTAL</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column-reverse" }}>
              {orderBook.asks.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, padding: "3px 0", position: "relative" }}>
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, background: `${C.red}15`, width: `${a.depthPct}%` }} />
                  <span style={{ color: C.red }}>{a.price.toFixed(1)}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{a.size}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{a.total}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "12px 0", margin: "8px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{price.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: C.muted }}>SPREAD: 0.5 (0.01%)</div>
            </div>

            <div>
              {orderBook.bids.map((b, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, padding: "3px 0", position: "relative" }}>
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, background: `${C.accent}15`, width: `${b.depthPct}%` }} />
                  <span style={{ color: C.accent }}>{b.price.toFixed(1)}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{b.size}</span>
                  <span style={{ textAlign: "right", zIndex: 1 }}>{b.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 20, background: C.bg, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>EXECUTE</span>
              <Tag color={C.accent}>{activeMarket.split('-')[2] || 'ORDER'}</Tag>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <input
                  type="number" placeholder="0.00" value={orderSize}
                  onChange={e => setOrderSize(e.target.value)}
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, padding: "12px 40px 12px 12px", color: C.white, borderRadius: 6, outline: "none" }}
                />
                <span style={{ position: "absolute", right: 12, top: 14, fontSize: 11, color: C.muted }}>USD</span>
              </div>

              <div style={{ background: C.surface, padding: 12, borderRadius: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: C.muted }}>Est. Payout</span>
                  <span style={{ color: C.accent }}>${orderSize ? (orderSize * 1.85).toFixed(2) : '0.00'}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: C.muted }}>Platform Fee</span>
                  <span>$0.50</span>
                </div>
              </div>

              <Btn fullWidth onClick={handlePlaceOrder} disabled={isExecuting} style={{ opacity: isExecuting ? 0.7 : 1 }}>
                {isExecuting ? "ROUTING ORDER..." : `PLACE ${activeMarket.includes('UP') ? 'BUY' : 'SELL'} ORDER`}
              </Btn>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<TerminalScreen />);