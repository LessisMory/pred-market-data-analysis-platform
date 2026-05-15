const { C, Logo, Btn, Tag } = window;
const { useEffect, useMemo, useRef, useState } = React;

const CONTRACT_LIMIT = 60;
const SAMPLE_LIMIT = 1000;

const THEME = {
  shell: '#061117',
  shellAlt: '#0b1820',
  ink: '#eef8f4',
  muted: '#88a39c',
  line: 'rgba(117, 160, 151, 0.16)',
  panel: 'rgba(8, 22, 28, 0.82)',
  panelStrong: 'rgba(12, 31, 39, 0.92)',
  edge: 'rgba(112, 163, 151, 0.18)',
  sun: '#ffcb66',
  ice: '#79d8ff',
  up: '#2ad79c',
  upSoft: 'rgba(42, 215, 156, 0.16)',
  upGlow: 'rgba(42, 215, 156, 0.22)',
  down: '#ff866b',
  downSoft: 'rgba(255, 134, 107, 0.16)',
  downGlow: 'rgba(255, 134, 107, 0.22)',
  violet: '#8fa8ff',
};

const TERMINAL_STYLES = `
  .terminal-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(circle at 0% 0%, rgba(121, 216, 255, 0.14), transparent 28%),
      radial-gradient(circle at 100% 0%, var(--tone-glow), transparent 30%),
      linear-gradient(180deg, #061117 0%, #07171d 44%, #08131a 100%);
    color: ${THEME.ink};
    position: relative;
    overflow: hidden;
  }

  .terminal-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: linear-gradient(180deg, rgba(0,0,0,0.45), transparent 92%);
    pointer-events: none;
  }

  .terminal-topbar,
  .terminal-main {
    position: relative;
    z-index: 1;
  }

  .terminal-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px clamp(14px, 2vw, 24px);
    border-bottom: 1px solid ${THEME.edge};
    background: rgba(4, 15, 20, 0.42);
    backdrop-filter: blur(16px);
  }

  .terminal-topbar-left,
  .terminal-topbar-right,
  .control-row,
  .panel-header,
  .chart-meta,
  .chart-legend,
  .snapshot-row,
  .snapshot-meta,
  .depth-summary,
  .depth-legend,
  .detail-item {
    display: flex;
    align-items: center;
  }

  .terminal-topbar-left,
  .terminal-topbar-right,
  .chart-legend,
  .snapshot-meta,
  .depth-summary,
  .depth-legend {
    gap: 8px;
  }

  .terminal-main {
    width: min(1480px, calc(100vw - 16px));
    margin: 0 auto;
    flex: 1;
    min-height: 0;
    padding: 10px clamp(10px, 1.4vw, 18px) 14px;
  }

  .terminal-frame {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: 272px minmax(0, 1fr);
    gap: 12px;
    align-items: stretch;
  }

  .terminal-sidebar,
  .terminal-content {
    min-height: 0;
    border-radius: 24px;
    border: 1px solid ${THEME.edge};
    background: rgba(7, 20, 26, 0.72);
    backdrop-filter: blur(18px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  }

  .terminal-sidebar {
    overflow: auto;
  }

  .terminal-content {
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sidebar-inner,
  .content-stack {
    display: flex;
    flex-direction: column;
  }

  .sidebar-inner {
    gap: 12px;
    padding: 14px;
  }

  .content-stack {
    gap: 12px;
    padding: 12px;
  }

  .eyebrow {
    font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${THEME.muted};
  }

  .status-card,
  .metric-card,
  .terminal-panel,
  .outcome-button,
  .select-shell,
  .detail-card {
    border: 1px solid ${THEME.edge};
    background: ${THEME.panel};
    backdrop-filter: blur(18px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  }

  .status-card {
    border-radius: 999px;
    padding: 8px 12px;
  }

  .status-label {
    color: ${THEME.muted};
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .status-value {
    font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace;
    font-size: 12px;
    color: ${THEME.ink};
  }

  .sidebar-shell {
    border-radius: 20px;
    padding: 14px 14px 16px;
    background:
      linear-gradient(155deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
      radial-gradient(circle at 88% 16%, var(--tone-soft), transparent 30%),
      rgba(10, 27, 33, 0.84);
    border: 1px solid rgba(255,255,255,0.05);
  }

  .sidebar-title {
    margin-top: 10px;
    font-family: 'Space Grotesk', 'DM Sans', sans-serif;
    font-size: clamp(22px, 2.4vw, 30px);
    line-height: 0.95;
    letter-spacing: -0.04em;
  }

  .sidebar-copy {
    margin-top: 8px;
    color: #a9c2bb;
    line-height: 1.55;
    font-size: 13px;
  }

  .sidebar-tags {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .control-card {
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .control-row {
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 8px;
  }

  .control-label {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${THEME.muted};
  }

  .control-hint {
    color: ${THEME.ink};
    font-size: 13px;
    font-weight: 600;
  }

  .select-shell {
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    background: rgba(0, 0, 0, 0.22);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .select-shell::after {
    content: 'v';
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${THEME.muted};
    font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace;
    pointer-events: none;
  }

  .market-select {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: ${THEME.ink};
    padding: 13px 14px;
    padding-right: 38px;
    font-size: 14px;
  }

  .outcome-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .outcome-button {
    border-radius: 18px;
    padding: 12px 14px;
    text-align: left;
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    background: rgba(255, 255, 255, 0.03);
  }

  .outcome-button:hover {
    transform: translateY(-1px);
  }

  .outcome-button.is-active {
    border-color: var(--tone);
    background: linear-gradient(180deg, var(--tone-soft), rgba(255,255,255,0.02));
    box-shadow: 0 14px 36px var(--tone-glow);
  }

  .outcome-button.is-inactive {
    opacity: 0.72;
  }

  .outcome-kicker {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${THEME.muted};
  }

  .outcome-name {
    margin-top: 8px;
    font-family: 'Space Grotesk', 'DM Sans', sans-serif;
    font-size: 18px;
    line-height: 1;
  }

  .outcome-copy {
    margin-top: 8px;
    color: #a9c2bb;
    font-size: 12px;
    line-height: 1.45;
  }

  .summary-strip {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
  }

  .summary-stat {
    padding: 6px 7px;
    border-radius: 18px;
    border: 1px solid ${THEME.edge};
    background: rgba(8, 22, 28, 0.88);
    min-height: 82px;
  }

  .summary-stat-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${THEME.muted};
  }

  .summary-stat-value {
    margin-top: 10px;
    font-family: 'Space Grotesk', 'DM Sans', sans-serif;
    font-size: 22px;
    line-height: 1;
    color: var(--summaryColor, ${THEME.ink});
  }

  .summary-stat-sub {
    margin-top: 8px;
    color: #a9c2bb;
    font-size: 11px;
    line-height: 1.35;
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .board-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    gap: 12px;
    align-items: stretch;
  }

  .board-main,
  .board-side {
    display: grid;
    gap: 12px;
    align-content: start;
    min-height: 0;
  }

  .panel-fill {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .terminal-panel {
    border-radius: 22px;
    padding: 16px;
  }

  .panel-header {
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .panel-title {
    margin-top: 4px;
    font-family: 'Space Grotesk', 'DM Sans', sans-serif;
    font-size: 20px;
    letter-spacing: -0.03em;
  }

  .panel-copy {
    margin-top: 4px;
    color: #a9c2bb;
    font-size: 12px;
    line-height: 1.45;
  }

  .chart-meta {
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .chart-legend {
    flex-wrap: wrap;
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: ${THEME.muted};
    font-size: 11px;
  }

  .legend-line {
    width: 24px;
    height: 0;
    border-top: 2px solid currentColor;
    border-radius: 999px;
  }

  .legend-line.is-dashed {
    border-top-style: dashed;
  }

  .legend-line.is-dotted {
    border-top-style: dotted;
  }

  .chart-shell {
    padding: 12px 12px 8px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)),
      rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255,255,255,0.05);
  }

  .snapshot-slider {
    flex: 1;
    min-width: 180px;
    accent-color: var(--tone);
  }

  .sidebar-scrubber {
    display: grid;
    gap: 12px;
  }

  .sidebar-scrubber .control-row {
    margin-bottom: 0;
  }

  .sidebar-scrubber .scrubber-title {
    margin-top: 0;
    font-size: 16px;
    line-height: 1.2;
  }

  .sidebar-scrubber .scrubber-readout {
    margin-top: 0;
  }

  .sidebar-scrubber .snapshot-slider {
    width: 100%;
    min-width: 0;
  }

  .sidebar-scrubber .snapshot-chip {
    justify-self: start;
  }

  .snapshot-chip {
    padding: 9px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: ${THEME.ink};
    font-size: 12px;
  }

  .depth-visual {
    display: grid;
    gap: 10px;
  }

  .depth-summary {
    flex-wrap: wrap;
    margin-bottom: 0;
  }

  .depth-pill {
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    font-size: 11px;
    color: #c4d8d1;
  }

  .depth-chart-shell {
    padding: 12px 12px 8px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.05);
    background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  }

  .imbalance-shell {
    padding: 12px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
  }

  .imbalance-header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .micro-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .micro-stat-grid.is-compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .micro-stat {
    padding: 10px 10px 8px;
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.04);
  }

  .micro-stat-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${THEME.muted};
  }

  .micro-stat-value {
    margin-top: 7px;
    font-family: 'Space Grotesk', 'DM Sans', sans-serif;
    font-size: 17px;
  }

  .micro-stat-sub {
    margin-top: 5px;
    color: #a9c2bb;
    font-size: 11px;
  }

  .scrubber-title {
    margin-top: 4px;
    font-family: 'Space Grotesk', 'DM Sans', sans-serif;
    font-size: 18px;
    line-height: 1;
  }

  .scrubber-readout {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .alert-banner {
    padding: 14px 18px;
    border-radius: 22px;
    border: 1px solid rgba(255, 134, 107, 0.25);
    background: rgba(255, 134, 107, 0.1);
    color: #ffd2c7;
    line-height: 1.5;
  }

  .empty-state {
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 10px;
    border-radius: 24px;
    border: 1px dashed rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
    color: ${THEME.muted};
    text-align: center;
    padding: 20px;
  }

  .loading-shell {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 50% 20%, rgba(121, 216, 255, 0.12), transparent 24%),
      linear-gradient(180deg, #061117 0%, #08151b 100%);
  }

  .loading-card {
    padding: 26px 28px;
    border-radius: 26px;
    background: rgba(6, 18, 24, 0.88);
    border: 1px solid ${THEME.edge};
    text-align: center;
  }

  .spinner {
    width: 42px;
    height: 42px;
    margin: 0 auto 18px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.08);
    border-top-color: var(--tone);
    animation: spin 1s linear infinite;
  }

  @media (max-width: 1320px) {
    .terminal-frame {
      grid-template-columns: 250px minmax(0, 1fr);
    }
  }

  @media (max-width: 1180px) {
    .terminal-frame,
    .board-grid,
    .board-main,
    .board-side,
    .workspace-grid {
      grid-template-columns: 1fr;
    }

    .summary-strip,
    .micro-stat-grid,
    .micro-stat-grid.is-compact {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 860px) {
    .terminal-topbar {
      flex-direction: column;
      align-items: stretch;
    }

    .terminal-topbar-right {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .outcome-grid,
    .summary-strip,
    .micro-stat-grid,
    .micro-stat-grid.is-compact {
      grid-template-columns: 1fr;
    }
  }
`;

const makeContractKey = (contract) => `${contract.marketId || ''}::${contract.assetId || ''}`;

const outcomeSortWeight = (contract) => {
  const token = String(contract?.tokenName || '').trim().toLowerCase();
  if (token === 'up') return 0;
  if (token === 'down') return 1;
  return 10;
};

const splitMarketName = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) {
    return { title: 'Market Session', timeLabel: 'Unknown window' };
  }

  const parts = raw.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { title: raw, timeLabel: raw };
  }

  return {
    title: parts.slice(0, -1).join(' - '),
    timeLabel: parts[parts.length - 1],
  };
};

const formatTimestamp = (value, options = {}) => {
  if (!value) return 'No timestamp';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: options.compact ? undefined : '2-digit',
  });
};

const formatWindowTimestamp = (value) => {
  if (!value) return 'Unknown';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatContractPrice = (value, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  return `${(Number(value) * 100).toFixed(digits)}c`;
};

const formatSignedPercent = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  const numeric = Number(value);
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(digits)}%`;
};

const formatCompactNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const formatCurrency = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  return Number(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatUsdCompact = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  return Number(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
};

const formatSpread = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  return `${(Number(value) * 100).toFixed(2)}c`;
};

const formatResultLogic = (value, tokenName) => {
  const text = String(value || '').trim().toLowerCase();
  const token = String(tokenName || '').trim();
  const normalizedToken = token.toLowerCase();

  if (!text) return 'Result unavailable';
  if (text === 'undetermined') return 'Result undetermined';
  if (text === 'yes') return token ? `${token} wins` : 'Result YES';
  if (text === 'no') {
    if (normalizedToken === 'up') return 'Down wins';
    if (normalizedToken === 'down') return 'Up wins';
    return 'Result NO';
  }

  return text.replace(/_/g, ' ');
};

const buildAuthHeaders = async () => {
  await window.FirebaseAuthClient?.ensureSession?.();

  const token = localStorage.getItem('jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestJson = async (url) => {
  const response = await fetch(url, {
    headers: await buildAuthHeaders(),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (response.status === 401) {
    window.location.href = 'index.html';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.detail || `HTTP ${response.status}`);
  }

  return payload;
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const groupContractsByMarket = (contracts = []) => {
  const groups = [];
  const seen = new Map();

  contracts.forEach((contract) => {
    const key = contract.marketId || contract.slug || contract.label;
    if (!key) {
      return;
    }

    const parsed = splitMarketName(contract.marketName || contract.label || contract.slug);
    if (!seen.has(key)) {
      const group = {
        key,
        marketId: contract.marketId || null,
        slug: contract.slug || null,
        marketName: contract.marketName || parsed.title,
        title: parsed.title,
        timeLabel: parsed.timeLabel,
        contracts: [],
      };
      groups.push(group);
      seen.set(key, group);
    }

    seen.get(key).contracts.push(contract);
  });

  return groups.map((group) => ({
    ...group,
    contracts: [...group.contracts].sort((left, right) => {
      const outcomeDelta = outcomeSortWeight(left) - outcomeSortWeight(right);
      if (outcomeDelta !== 0) return outcomeDelta;
      return String(left.tokenName || '').localeCompare(String(right.tokenName || ''));
    }),
  }));
};

const pickDefaultContract = (contracts = []) =>
  contracts.find((contract) => String(contract.tokenName || '').trim().toLowerCase() === 'up') ||
  contracts[0] ||
  null;

const deriveOrderbookMid = (snapshot) => {
  const explicit = snapshot?.midPrice;
  if (explicit !== null && explicit !== undefined && Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }

  const bestBid = snapshot?.bids?.find((level) => Number.isFinite(Number(level?.price)));
  const bestAsk = snapshot?.asks?.find((level) => Number.isFinite(Number(level?.price)));
  if (!bestBid || !bestAsk) {
    return null;
  }

  return (Number(bestBid.price) + Number(bestAsk.price)) / 2;
};

const findNearestOraclePoint = (points = [], targetTimestamp) => {
  if (!points.length || !targetTimestamp) {
    return null;
  }

  const target = new Date(targetTimestamp).getTime();
  if (Number.isNaN(target)) {
    return null;
  }

  return points.reduce((closest, point) => {
    const candidate = new Date(point.timestamp).getTime();
    if (Number.isNaN(candidate)) {
      return closest;
    }

    if (!closest) {
      return point;
    }

    const currentDelta = Math.abs(candidate - target);
    const bestDelta = Math.abs(new Date(closest.timestamp).getTime() - target);
    return currentDelta < bestDelta ? point : closest;
  }, null);
};

const toTimestampMs = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getMidPriceTimeDomain = (series = []) => {
  const times = series
    .map((point) => ({
      time: new Date(point?.timestamp).getTime(),
      value: toFiniteNumber(point?.midPrice),
    }))
    .filter((point) => !Number.isNaN(point.time) && point.value !== null)
    .map((point) => point.time);

  if (!times.length) {
    return null;
  }

  const start = Math.min(...times);
  const end = Math.max(...times);

  return {
    start,
    end,
    plotEnd: end > start ? end : start + 1000,
  };
};

const getMarketWindowFromContract = (contract) => {
  if (!contract) {
    return null;
  }

  const explicitStart = toTimestampMs(
    contract.marketStart
    ?? contract.market_start
    ?? contract.marketStartTs
    ?? contract.market_start_ts
    ?? contract.startDate
    ?? contract.start_date
  );
  const explicitEnd = toTimestampMs(
    contract.marketEnd
    ?? contract.market_end
    ?? contract.marketEndTs
    ?? contract.market_end_ts
    ?? contract.endDate
    ?? contract.end_date
  );

  if (explicitStart !== null && explicitEnd !== null) {
    return {
      start: explicitStart,
      end: explicitEnd,
      plotEnd: explicitEnd > explicitStart ? explicitEnd : explicitStart + 1000,
    };
  }

  const slug = String(contract.slug || '').trim();
  const startMatch = slug.match(/([0-9]{10})(?!.*[0-9])/);
  if (!startMatch) {
    return null;
  }

  const durationMatch = slug.match(/-([0-9]+)m-/i);
  const durationMinutes = Number.parseInt(durationMatch?.[1] || '', 10);
  const durationMs = (
    Number.isInteger(durationMinutes) && durationMinutes > 0
      ? durationMinutes
      : 15
  ) * 60 * 1000;
  const start = Number(startMatch[1]) * 1000;
  const end = start + durationMs;

  return {
    start,
    end,
    plotEnd: end > start ? end : start + 1000,
  };
};

const isWithinTimeDomain = (time, domain) => {
  if (!domain) {
    return true;
  }

  return time >= domain.start && time <= domain.end;
};

const EmptyState = ({ title, message, height = 220 }) => (
  <div className="empty-state" style={{ minHeight: height }}>
    <div style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontSize: 22 }}>{title}</div>
    <div style={{ maxWidth: 420, lineHeight: 1.6 }}>{message}</div>
  </div>
);

const SummaryStat = ({ label, value, sub, color }) => (
  <div className="summary-stat" style={{ '--summaryColor': color || THEME.ink }}>
    <div className="summary-stat-label">{label}</div>
    <div className="summary-stat-value">{value}</div>
    <div className="summary-stat-sub">{sub}</div>
  </div>
);

const SnapshotScrubberCard = ({
  selectedSnapshot,
  selectedSnapshotIndex,
  activeSeries,
  selectedOracleValue,
  selectedImbalancePct,
  tone,
  onSelectTimestamp,
}) => (
  <div className="control-card sidebar-scrubber">
    <div className="control-row">
      <div className="control-label">Snapshot scrubber</div>
      <div className="control-hint">
        {selectedSnapshot?.timestamp ? formatTimestamp(selectedSnapshot.timestamp, { compact: true }) : 'No snapshot'}
      </div>
    </div>

    <div className="scrubber-title">
      {selectedSnapshot?.timestamp ? formatTimestamp(selectedSnapshot.timestamp, { compact: true }) : 'No snapshot selected'}
    </div>

    <div className="scrubber-readout">
      <Tag color={tone.base}>Mid {formatContractPrice(selectedSnapshot?.midPrice)}</Tag>
      <Tag color={THEME.ice}>Theo {formatContractPrice(selectedSnapshot?.theoreticalPrice)}</Tag>
      <Tag color={THEME.sun}>BTC {formatCurrency(selectedOracleValue, 0)}</Tag>
      <Tag color={Number(selectedSnapshot?.imbalance) >= 0 ? THEME.up : THEME.down}>
        Imb {formatSignedPercent(selectedImbalancePct, 1)}
      </Tag>
    </div>

    <input
      type="range"
      className="snapshot-slider"
      min="0"
      max={Math.max(activeSeries.length - 1, 0)}
      step="1"
      value={selectedSnapshotIndex}
      onChange={(event) => {
        const nextIndex = Number(event.target.value);
        onSelectTimestamp(activeSeries[nextIndex]?.timestamp || '');
      }}
    />

    <button
      type="button"
      className="snapshot-chip"
      onClick={() => onSelectTimestamp(activeSeries[activeSeries.length - 1]?.timestamp || '')}
    >
      Latest
    </button>
  </div>
);

const PriceOverlayChart = ({
  marketSeries,
  oracleSeries,
  marketWindow,
  selectedTimestamp,
  strikePrice,
  resolvePrice,
  toneColor,
}) => {
  const timeDomain = marketWindow || getMidPriceTimeDomain(marketSeries);
  const marketPoints = marketSeries
    .map((point) => ({
      time: new Date(point.timestamp).getTime(),
      value: point.midPrice === null || point.midPrice === undefined ? null : Number(point.midPrice),
    }))
    .filter((point) => !Number.isNaN(point.time) && Number.isFinite(point.value));
  if (!timeDomain || !marketPoints.length) {
    return (
      <EmptyState
        title="No chartable data yet"
        message="This contract needs valid market samples before the price overlay can render."
        height={300}
      />
    );
  }

  const boundedMarketPoints = marketPoints.filter((point) => isWithinTimeDomain(point.time, timeDomain));
  const theoreticalPoints = marketSeries
    .map((point) => ({
      time: new Date(point.timestamp).getTime(),
      value:
        point.theoreticalPrice === null || point.theoreticalPrice === undefined
          ? null
          : Number(point.theoreticalPrice),
    }))
    .filter((point) => !Number.isNaN(point.time) && Number.isFinite(point.value))
    .filter((point) => isWithinTimeDomain(point.time, timeDomain));

  const btcPoints = oracleSeries
    .map((point) => ({
      time: new Date(point.timestamp).getTime(),
      value: point.value === null || point.value === undefined ? null : Number(point.value),
    }))
    .filter((point) => !Number.isNaN(point.time) && Number.isFinite(point.value))
    .filter((point) => isWithinTimeDomain(point.time, timeDomain));

  const width = 920;
  const height = 300;
  const padding = { top: 16, right: 82, bottom: 34, left: 58 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const minTime = timeDomain.start;
  const maxTime = timeDomain.plotEnd;

  const marketValues = [...boundedMarketPoints, ...theoreticalPoints].map((point) => point.value);
  const marketMin = marketValues.length ? Math.min(...marketValues) : 0;
  const marketMax = marketValues.length ? Math.max(...marketValues) : 1;
  const marketPad = marketValues.length ? Math.max((marketMax - marketMin) * 0.16, 0.05) : 0;
  const marketLower = Math.max(0, marketMin - marketPad);
  const marketUpper = Math.min(1, marketMax + marketPad || 1);

  const btcReferenceValues = btcPoints.map((point) => point.value);
  if (strikePrice !== null && strikePrice !== undefined && Number.isFinite(Number(strikePrice))) {
    btcReferenceValues.push(Number(strikePrice));
  }
  if (resolvePrice !== null && resolvePrice !== undefined && Number.isFinite(Number(resolvePrice))) {
    btcReferenceValues.push(Number(resolvePrice));
  }
  const btcMin = btcReferenceValues.length ? Math.min(...btcReferenceValues) : 0;
  const btcMax = btcReferenceValues.length ? Math.max(...btcReferenceValues) : 1;
  const btcPad = btcReferenceValues.length ? Math.max((btcMax - btcMin) * 0.18, btcMax * 0.002) : 0;
  const btcLower = Math.max(0, btcMin - btcPad);
  const btcUpper = btcMax + btcPad;

  const xFor = (time) => padding.left + ((time - minTime) / (maxTime - minTime)) * innerWidth;
  const yForMarket = (value) => padding.top + innerHeight - ((value - marketLower) / ((marketUpper - marketLower) || 1)) * innerHeight;
  const yForBtc = (value) => padding.top + innerHeight - ((value - btcLower) / ((btcUpper - btcLower) || 1)) * innerHeight;

  const buildPath = (points, yFor) => points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(point.time).toFixed(2)} ${yFor(point.value).toFixed(2)}`)
    .join(' ');

  const buildArea = (points) => {
    if (points.length < 2) {
      return '';
    }

    const top = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(point.time).toFixed(2)} ${yForMarket(point.value).toFixed(2)}`)
      .join(' ');
    return `${top} L ${xFor(points[points.length - 1].time).toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} L ${xFor(points[0].time).toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} Z`;
  };

  const marketPath = buildPath(boundedMarketPoints, yForMarket);
  const marketArea = buildArea(boundedMarketPoints);
  const theoreticalPath = buildPath(theoreticalPoints, yForMarket);
  const btcPath = buildPath(btcPoints, yForBtc);
  const selectedTime = (() => {
    const parsed = new Date(selectedTimestamp || '').getTime();
    return Number.isNaN(parsed) ? maxTime : parsed;
  })();
  const selectedX = xFor(Math.max(minTime, Math.min(maxTime, selectedTime)));
  const selectedMarketPoint = boundedMarketPoints.length
    ? boundedMarketPoints.reduce((closest, point) => (Math.abs(point.time - selectedTime) < Math.abs(closest.time - selectedTime) ? point : closest), boundedMarketPoints[0])
    : null;
  const selectedTheoreticalPoint = theoreticalPoints.length
    ? theoreticalPoints.reduce((closest, point) => (Math.abs(point.time - selectedTime) < Math.abs(closest.time - selectedTime) ? point : closest), theoreticalPoints[0])
    : null;
  const selectedBtcPoint = btcPoints.length
    ? btcPoints.reduce((closest, point) => (Math.abs(point.time - selectedTime) < Math.abs(closest.time - selectedTime) ? point : closest), btcPoints[0])
    : null;
  const axisSteps = [0, 0.5, 1];

  return (
    <svg width="100%" height="300" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="midAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={toneColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={toneColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {axisSteps.map((step) => {
        const y = padding.top + innerHeight * step;
        return (
          <line
            key={`grid-${step}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {marketArea ? <path d={marketArea} fill="url(#midAreaGradient)" /> : null}
      {marketPath ? (
        <path
          d={marketPath}
          fill="none"
          stroke={toneColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {theoreticalPath ? (
        <path
          d={theoreticalPath}
          fill="none"
          stroke={THEME.ice}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 6"
        />
      ) : null}

      {btcPath ? (
        <path
          d={btcPath}
          fill="none"
          stroke={THEME.sun}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0"
        />
      ) : null}

      {strikePrice !== null && strikePrice !== undefined && Number.isFinite(Number(strikePrice)) ? (
        <>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={yForBtc(Number(strikePrice))}
            y2={yForBtc(Number(strikePrice))}
            stroke={THEME.sun}
            strokeOpacity="0.8"
            strokeWidth="1.2"
            strokeDasharray="7 6"
          />
          <text
            x={width - padding.right + 8}
            y={yForBtc(Number(strikePrice)) - 6}
            fill={THEME.sun}
            fontSize="11"
            fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
          >
            Strike {formatUsdCompact(strikePrice)}
          </text>
        </>
      ) : null}

      {resolvePrice !== null && resolvePrice !== undefined && Number.isFinite(Number(resolvePrice)) ? (
        <>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={yForBtc(Number(resolvePrice))}
            y2={yForBtc(Number(resolvePrice))}
            stroke={THEME.violet}
            strokeOpacity="0.95"
            strokeWidth="1.2"
            strokeDasharray="3 6"
          />
          <text
            x={width - padding.right + 8}
            y={yForBtc(Number(resolvePrice)) + 14}
            fill={THEME.violet}
            fontSize="11"
            fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
          >
            Resolve {formatUsdCompact(resolvePrice)}
          </text>
        </>
      ) : null}

      <line
        x1={selectedX}
        x2={selectedX}
        y1={padding.top}
        y2={padding.top + innerHeight}
        stroke="rgba(255,255,255,0.22)"
        strokeDasharray="4 5"
      />

      {selectedMarketPoint ? (
        <circle
          cx={xFor(selectedMarketPoint.time)}
          cy={yForMarket(selectedMarketPoint.value)}
          r="5.6"
          fill={toneColor}
          stroke="rgba(6,17,23,0.9)"
          strokeWidth="2"
        />
      ) : null}

      {selectedTheoreticalPoint ? (
        <circle
          cx={xFor(selectedTheoreticalPoint.time)}
          cy={yForMarket(selectedTheoreticalPoint.value)}
          r="4.6"
          fill={THEME.ice}
          stroke="rgba(6,17,23,0.9)"
          strokeWidth="2"
        />
      ) : null}

      {selectedBtcPoint ? (
        <circle
          cx={xFor(selectedBtcPoint.time)}
          cy={yForBtc(selectedBtcPoint.value)}
          r="4.6"
          fill={THEME.sun}
          stroke="rgba(6,17,23,0.9)"
          strokeWidth="2"
        />
      ) : null}

      {[0, 1, 2].map((index) => {
        const fraction = index / 2;
        const y = padding.top + innerHeight - fraction * innerHeight;
        const marketValue = marketLower + (marketUpper - marketLower) * fraction;
        const btcValue = btcLower + (btcUpper - btcLower) * fraction;

        return (
          <g key={`axis-${index}`}>
            <text
              x={padding.left - 10}
              y={y + 4}
              fill={THEME.muted}
              fontSize="11"
              textAnchor="end"
              fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
            >
              {formatContractPrice(marketValue)}
            </text>
            <text
              x={width - padding.right + 10}
              y={y + 4}
              fill={THEME.muted}
              fontSize="11"
              textAnchor="start"
              fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
            >
              {formatUsdCompact(btcValue)}
            </text>
          </g>
        );
      })}

      <text
        x={padding.left}
        y={height - 8}
        fill={THEME.muted}
        fontSize="11"
        fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
      >
        {formatWindowTimestamp(new Date(minTime).toISOString())}
      </text>
      <text
        x={width - padding.right}
        y={height - 8}
        fill={THEME.muted}
        fontSize="11"
        textAnchor="end"
        fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
      >
        {formatWindowTimestamp(new Date(maxTime).toISOString())}
      </text>
    </svg>
  );
};

const OrderBookSpreadChart = ({ bids, asks }) => {
  const width = 920;
  const height = 220;
  const padding = { top: 18, right: 24, bottom: 54, left: 24 };
  const innerHeight = height - padding.top - padding.bottom;
  const centerX = width / 2;
  const centerGap = 78;
  const orderedBids = [...bids].slice(0, 5);
  const orderedAsks = [...asks].slice(0, 5);
  const maxLevels = Math.max(orderedBids.length, orderedAsks.length, 1);
  const columnWidth = Math.min(52, Math.max(30, ((width / 2) - centerGap - 40) / maxLevels - 14));
  const spacing = 14;
  const maxSize = Math.max(
    ...orderedBids.map((level) => Number(level.size) || 0),
    ...orderedAsks.map((level) => Number(level.size) || 0),
    1
  );
  const bestBid = orderedBids[0] || null;
  const bestAsk = orderedAsks[0] || null;
  const spreadLabel = (bestBid && bestAsk)
    ? formatSpread(Number(bestAsk.price) - Number(bestBid.price))
    : 'n/a';

  const bidX = (index) => centerX - (centerGap / 2) - columnWidth - index * (columnWidth + spacing);
  const askX = (index) => centerX + (centerGap / 2) + index * (columnWidth + spacing);
  const barHeight = (size) => ((Number(size) || 0) / maxSize) * Math.max(innerHeight - 28, 96);

  return (
    <svg width="100%" height="220" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      {[0, 0.33, 0.66, 1].map((step) => {
        const y = padding.top + innerHeight * step;
        return (
          <line
            key={`depth-grid-${step}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        );
      })}

      <rect
        x={centerX - centerGap / 2}
        y={padding.top}
        width={centerGap}
        height={innerHeight}
        rx="18"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.05)"
      />
      <text
        x={centerX}
        y={padding.top + 58}
        textAnchor="middle"
        fill={THEME.muted}
        fontSize="11"
        fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
      >
        Spread
      </text>
      <text
        x={centerX}
        y={padding.top + 82}
        textAnchor="middle"
        fill={THEME.ink}
        fontSize="18"
        fontFamily="'Space Grotesk', 'DM Sans', sans-serif"
      >
        {spreadLabel}
      </text>

      {orderedBids.map((level, index) => {
        const h = barHeight(level.size);
        const x = bidX(index);
        const y = padding.top + innerHeight - h;
        return (
          <g key={`bid-bar-${index}`}>
            <rect x={x} y={y} width={columnWidth} height={h} rx="14" fill="rgba(42, 215, 156, 0.88)" />
            <text x={x + columnWidth / 2} y={y - 8} textAnchor="middle" fill={THEME.up} fontSize="11" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
              {formatCompactNumber(level.size, 1)}
            </text>
            <text x={x + columnWidth / 2} y={height - 30} textAnchor="middle" fill={THEME.muted} fontSize="10" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
              L{index + 1}
            </text>
            <text x={x + columnWidth / 2} y={height - 14} textAnchor="middle" fill={THEME.ink} fontSize="11" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
              {formatContractPrice(level.price, 2)}
            </text>
          </g>
        );
      })}

      {orderedAsks.map((level, index) => {
        const h = barHeight(level.size);
        const x = askX(index);
        const y = padding.top + innerHeight - h;
        return (
          <g key={`ask-bar-${index}`}>
            <rect x={x} y={y} width={columnWidth} height={h} rx="14" fill="rgba(255, 134, 107, 0.88)" />
            <text x={x + columnWidth / 2} y={y - 8} textAnchor="middle" fill={THEME.down} fontSize="11" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
              {formatCompactNumber(level.size, 1)}
            </text>
            <text x={x + columnWidth / 2} y={height - 30} textAnchor="middle" fill={THEME.muted} fontSize="10" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
              L{index + 1}
            </text>
            <text x={x + columnWidth / 2} y={height - 14} textAnchor="middle" fill={THEME.ink} fontSize="11" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
              {formatContractPrice(level.price, 2)}
            </text>
          </g>
        );
      })}

      {bestBid ? (
        <text x={centerX - centerGap / 2 - 10} y={padding.top + innerHeight + 26} textAnchor="end" fill={THEME.up} fontSize="11" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
          Best bid {formatContractPrice(bestBid.price, 2)}
        </text>
      ) : null}
      {bestAsk ? (
        <text x={centerX + centerGap / 2 + 10} y={padding.top + innerHeight + 26} textAnchor="start" fill={THEME.down} fontSize="11" fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace">
          Best ask {formatContractPrice(bestAsk.price, 2)}
        </text>
      ) : null}
    </svg>
  );
};

const ImbalanceHistoryChart = ({ series, marketWindow, selectedTimestamp }) => {
  const timeDomain = marketWindow || getMidPriceTimeDomain(series);
  const points = series
    .map((point) => ({
      time: new Date(point.timestamp).getTime(),
      value: point.imbalance === null || point.imbalance === undefined ? null : Number(point.imbalance),
    }))
    .filter((point) => !Number.isNaN(point.time) && Number.isFinite(point.value))
    .filter((point) => isWithinTimeDomain(point.time, timeDomain));

  if (!timeDomain || !points.length) {
    return (
      <EmptyState
        title="No imbalance history"
        message="Imbalance history will render once the market service returns chartable market snapshots for this session."
        height={120}
      />
    );
  }

  const width = 920;
  const height = 126;
  const padding = { top: 14, right: 16, bottom: 24, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const minTime = timeDomain.start;
  const maxTime = timeDomain.plotEnd;
  const xFor = (time) => padding.left + ((time - minTime) / (maxTime - minTime)) * innerWidth;
  const yFor = (value) => padding.top + innerHeight - ((value + 1) / 2) * innerHeight;
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(point.time).toFixed(2)} ${yFor(point.value).toFixed(2)}`)
    .join(' ');
  const selectedTime = (() => {
    const parsed = new Date(selectedTimestamp || '').getTime();
    return Number.isNaN(parsed) ? maxTime : parsed;
  })();
  const selectedX = xFor(Math.max(minTime, Math.min(maxTime, selectedTime)));
  const selectedPoint = points.reduce(
    (closest, point) => (Math.abs(point.time - selectedTime) < Math.abs(closest.time - selectedTime) ? point : closest),
    points[0]
  );
  const selectedColor = selectedPoint.value >= 0 ? THEME.up : THEME.down;

  return (
    <svg width="100%" height="126" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <rect
        x={padding.left}
        y={padding.top}
        width={innerWidth}
        height={innerHeight / 2}
        fill="rgba(42, 215, 156, 0.06)"
      />
      <rect
        x={padding.left}
        y={padding.top + innerHeight / 2}
        width={innerWidth}
        height={innerHeight / 2}
        fill="rgba(255, 134, 107, 0.05)"
      />

      {[-1, -0.5, 0, 0.5, 1].map((value) => (
        <line
          key={`imbalance-grid-${value}`}
          x1={padding.left}
          x2={width - padding.right}
          y1={yFor(value)}
          y2={yFor(value)}
          stroke={value === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}
          strokeDasharray={value === 0 ? '0' : '3 6'}
        />
      ))}

      <path
        d={path}
        fill="none"
        stroke={THEME.ice}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <line
        x1={selectedX}
        x2={selectedX}
        y1={padding.top}
        y2={padding.top + innerHeight}
        stroke="rgba(255,255,255,0.22)"
        strokeDasharray="4 5"
      />
      <circle
        cx={xFor(selectedPoint.time)}
        cy={yFor(selectedPoint.value)}
        r="4.6"
        fill={selectedColor}
        stroke="rgba(6,17,23,0.88)"
        strokeWidth="2"
      />

      {[1, 0, -1].map((value) => (
        <text
          key={`imbalance-axis-${value}`}
          x={padding.left - 8}
          y={yFor(value) + 4}
          textAnchor="end"
          fill={THEME.muted}
          fontSize="10"
          fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
        >
          {value > 0 ? '+100%' : value < 0 ? '-100%' : '0%'}
        </text>
      ))}

      <text
        x={padding.left}
        y={height - 6}
        fill={THEME.muted}
        fontSize="10"
        fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
      >
        {formatWindowTimestamp(new Date(minTime).toISOString())}
      </text>
      <text
        x={width - padding.right}
        y={height - 6}
        textAnchor="end"
        fill={THEME.muted}
        fontSize="10"
        fontFamily="'IBM Plex Mono', 'JetBrains Mono', monospace"
      >
        {formatWindowTimestamp(new Date(maxTime).toISOString())}
      </text>
    </svg>
  );
};

const ImbalanceSnapshotPanel = ({ snapshot }) => {
  const bids = Array.isArray(snapshot?.bids) ? snapshot.bids.filter((level) => level?.price !== null || level?.size !== null) : [];
  const asks = Array.isArray(snapshot?.asks) ? snapshot.asks.filter((level) => level?.price !== null || level?.size !== null) : [];
  const imbalancePct = (snapshot?.imbalance ?? null) === null ? null : Number(snapshot.imbalance) * 100;

  return (
    <div className="depth-visual">
      <div className="imbalance-shell">
        <div className="imbalance-header">
          <div>
            <div className="eyebrow">Snapshot Pressure</div>
            <div className="panel-copy">
              The selected scrubber point drives these pressure and flow readings for the same market timestamp.
            </div>
          </div>
          <Tag color={(Number(snapshot?.imbalance) || 0) >= 0 ? THEME.up : THEME.down}>
            {formatSignedPercent(imbalancePct, 1)}
          </Tag>
        </div>

        <div className="depth-summary">
          <div className="depth-pill">Bid stack {formatCompactNumber(snapshot?.totalBidSize, 2)}</div>
          <div className="depth-pill">Ask stack {formatCompactNumber(snapshot?.totalAskSize, 2)}</div>
          <div className="depth-pill">Buy flow {formatCompactNumber(snapshot?.buySize, 2)}</div>
          <div className="depth-pill">Sell flow {formatCompactNumber(snapshot?.sellSize, 2)}</div>
        </div>
      </div>

      <div className="micro-stat-grid is-compact">
        <div className="micro-stat">
          <div className="micro-stat-label">Bid stack</div>
          <div className="micro-stat-value">{formatCompactNumber(snapshot?.totalBidSize, 2)}</div>
          <div className="micro-stat-sub">{bids.length} displayed levels</div>
        </div>
        <div className="micro-stat">
          <div className="micro-stat-label">Ask stack</div>
          <div className="micro-stat-value">{formatCompactNumber(snapshot?.totalAskSize, 2)}</div>
          <div className="micro-stat-sub">{asks.length} displayed levels</div>
        </div>
        <div className="micro-stat">
          <div className="micro-stat-label">Buy size</div>
          <div className="micro-stat-value" style={{ color: THEME.up }}>{formatCompactNumber(snapshot?.buySize, 2)}</div>
          <div className="micro-stat-sub">Aggressive buys at this snapshot</div>
        </div>
        <div className="micro-stat">
          <div className="micro-stat-label">Sell size</div>
          <div className="micro-stat-value" style={{ color: THEME.down }}>{formatCompactNumber(snapshot?.sellSize, 2)}</div>
          <div className="micro-stat-sub">Aggressive sells at this snapshot</div>
        </div>
      </div>
    </div>
  );
};

const OrderBookPanel = ({ snapshot }) => {
  const bids = Array.isArray(snapshot?.bids) ? snapshot.bids.filter((level) => level?.price !== null || level?.size !== null) : [];
  const asks = Array.isArray(snapshot?.asks) ? snapshot.asks.filter((level) => level?.price !== null || level?.size !== null) : [];
  const hasDepth = bids.length || asks.length;

  return (
    <div className="depth-visual">
      <div className="depth-summary">
        <div className="depth-pill">Best bid {formatContractPrice(bids[0]?.price, 2)}</div>
        <div className="depth-pill">Best ask {formatContractPrice(asks[0]?.price, 2)}</div>
        <div className="depth-pill">Spread {formatSpread(snapshot?.spread)}</div>
        <div className="depth-pill">Imbalance {formatSignedPercent((snapshot?.imbalance ?? null) === null ? null : Number(snapshot.imbalance) * 100, 1)}</div>
      </div>

      <div className="depth-legend">
        <span className="legend-item" style={{ color: THEME.up }}>
          <span className="legend-line" />
          Bids from L1 outward
        </span>
        <span className="legend-item" style={{ color: THEME.down }}>
          <span className="legend-line" />
          Asks from L1 outward
        </span>
      </div>

      {hasDepth ? (
        <div className="depth-chart-shell">
          <OrderBookSpreadChart bids={bids} asks={asks} />
        </div>
      ) : (
        <EmptyState
          title="No order book depth"
          message="The selected snapshot does not currently expose book levels for this contract."
          height={220}
        />
      )}
    </div>
  );
};

const TerminalScreen = () => {
  const [contracts, setContracts] = useState([]);
  const [selectedMarketKey, setSelectedMarketKey] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [terminalData, setTerminalData] = useState(null);
  const [selectedSnapshotTimestamp, setSelectedSnapshotTimestamp] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const terminalDataRef = useRef(null);

  useEffect(() => {
    terminalDataRef.current = terminalData;
  }, [terminalData]);

  useEffect(() => {
    let cancelled = false;

    const loadContracts = async () => {
      try {
        setError('');
        setIsLoading(true);
        const payload = await requestJson(`/v1/markets/contracts?limit=${CONTRACT_LIMIT}`);
        if (cancelled) return;

        const nextContracts = Array.isArray(payload?.data) ? payload.data : [];
        setContracts(nextContracts);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Failed to load market sessions');
        setIsLoading(false);
      }
    };

    loadContracts();
    return () => {
      cancelled = true;
    };
  }, []);

  const marketGroups = useMemo(() => groupContractsByMarket(contracts), [contracts]);

  useEffect(() => {
    if (!marketGroups.length) {
      setSelectedMarketKey('');
      return;
    }

    setSelectedMarketKey((current) => (
      current && marketGroups.some((group) => group.key === current)
        ? current
        : marketGroups[0].key
    ));
  }, [marketGroups]);

  const activeMarketGroup = useMemo(
    () => marketGroups.find((group) => group.key === selectedMarketKey) || null,
    [marketGroups, selectedMarketKey]
  );

  useEffect(() => {
    if (!activeMarketGroup) {
      setSelectedAssetId('');
      return;
    }

    setSelectedAssetId((current) => (
      current && activeMarketGroup.contracts.some((contract) => contract.assetId === current)
        ? current
        : (pickDefaultContract(activeMarketGroup.contracts)?.assetId || activeMarketGroup.contracts[0]?.assetId || '')
    ));
  }, [activeMarketGroup]);

  const activeContract = useMemo(() => {
    if (!activeMarketGroup) {
      return terminalData?.contract || null;
    }

    return (
      activeMarketGroup.contracts.find((contract) => contract.assetId === selectedAssetId) ||
      pickDefaultContract(activeMarketGroup.contracts) ||
      terminalData?.contract ||
      null
    );
  }, [activeMarketGroup, selectedAssetId, terminalData]);

  useEffect(() => {
    if (!activeContract?.marketId || !activeContract?.assetId) {
      return undefined;
    }

    let cancelled = false;

    const loadTerminalData = async () => {
      try {
        setError('');
        if (terminalDataRef.current) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const params = new URLSearchParams({
          market_id: activeContract.marketId,
          asset_id: activeContract.assetId,
          limit: String(SAMPLE_LIMIT),
        });
        const payload = await requestJson(`/v1/markets/terminal?${params.toString()}`);
        if (cancelled) return;

        const nextPayload = payload;
        const series = Array.isArray(nextPayload?.series) ? nextPayload.series : [];
        setTerminalData(nextPayload);
        setSelectedSnapshotTimestamp((current) => (
          current && series.some((point) => point.timestamp === current)
            ? current
            : (series[series.length - 1]?.timestamp || '')
        ));
        setLastUpdated(new Date().toLocaleTimeString());
        setIsLoading(false);
        setIsRefreshing(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Failed to load terminal data');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    loadTerminalData();

    return () => {
      cancelled = true;
    };
  }, [activeContract?.marketId, activeContract?.assetId]);

  const activeSeries = Array.isArray(terminalData?.series) ? terminalData.series : [];
  const selectedSnapshotIndex = useMemo(() => {
    if (!activeSeries.length) {
      return 0;
    }

    const index = activeSeries.findIndex((point) => point.timestamp === selectedSnapshotTimestamp);
    return index >= 0 ? index : activeSeries.length - 1;
  }, [activeSeries, selectedSnapshotTimestamp]);

  const selectedSnapshot = activeSeries[selectedSnapshotIndex] || terminalData?.latest || null;
  const oracle = terminalData?.oracle || {};
  const oracleSeries = Array.isArray(oracle?.series) ? oracle.series : [];
  const activeMarketWindow = useMemo(
    () => getMarketWindowFromContract(activeContract || terminalData?.contract),
    [activeContract, terminalData]
  );
  const selectedOraclePoint = findNearestOraclePoint(oracleSeries, selectedSnapshot?.timestamp);
  const fallbackOraclePoint = selectedOraclePoint || oracleSeries[oracleSeries.length - 1] || null;
  const selectedOracleValue = fallbackOraclePoint?.value ?? oracle?.latest ?? null;
  const selectedOracleTimestamp = fallbackOraclePoint?.timestamp ?? oracle?.timestamp ?? null;
  const selectedOracleLabel = selectedSnapshot?.timestamp ? 'BTC @ snap' : 'BTC spot';
  const selectedImbalancePct = (selectedSnapshot?.imbalance ?? null) === null
    ? null
    : Number(selectedSnapshot.imbalance) * 100;
  const isDownOutcome = String(activeContract?.tokenName || '').trim().toLowerCase() === 'down';
  const tone = isDownOutcome
    ? { base: THEME.down, soft: THEME.downSoft, glow: THEME.downGlow }
    : { base: THEME.up, soft: THEME.upSoft, glow: THEME.upGlow };

  if (isLoading && !terminalData && !error) {
    return (
      <div className="loading-shell" style={{ '--tone': tone.base }}>
        <style>{TERMINAL_STYLES}</style>
        <div className="loading-card">
          <div className="spinner" />
          <div className="eyebrow">Terminal Sync</div>
          <div style={{ marginTop: 10, fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontSize: 26 }}>
            Loading market board
          </div>
          <div style={{ marginTop: 10, color: THEME.muted, maxWidth: 340, lineHeight: 1.6 }}>
            Pulling the session list and market snapshots for the selected contract.
          </div>
        </div>
      </div>
    );
  }

  if (!marketGroups.length && !error) {
    return (
      <div
        className="terminal-shell"
        style={{
          '--tone': tone.base,
          '--tone-soft': tone.soft,
          '--tone-glow': tone.glow,
        }}
      >
        <style>{TERMINAL_STYLES}</style>
        <header className="terminal-topbar">
          <div className="terminal-topbar-left">
            <Logo size={14} />
            <Tag color={tone.base}>NO SESSIONS</Tag>
          </div>
          <div className="terminal-topbar-right">
            <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>Exit terminal</Btn>
          </div>
        </header>
        <main className="terminal-main">
          <div className="terminal-frame">
            <aside className="terminal-sidebar">
              <div className="sidebar-inner">
                <div className="sidebar-shell">
                  <div className="eyebrow">Up / Down Market Monitor</div>
                  <div className="sidebar-title">No market sessions</div>
                  <div className="sidebar-copy">
                    The contracts endpoint returned no active up/down markets for the terminal right now.
                  </div>
                </div>
              </div>
            </aside>
            <section className="terminal-content">
              <div className="content-stack">
                <EmptyState
                  title="No market sessions available"
                  message="Once the service starts returning active contract pairs, they will appear in the left sidebar and the workspace here will populate."
                  height={420}
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="terminal-shell"
      style={{
        '--tone': tone.base,
        '--tone-soft': tone.soft,
        '--tone-glow': tone.glow,
      }}
    >
      <style>{TERMINAL_STYLES}</style>

      <header className="terminal-topbar">
        <div className="terminal-topbar-left">
          <Logo size={14} />
          <Tag color={tone.base}>{isRefreshing ? 'SYNCING' : 'LIVE TERMINAL'}</Tag>
          <Tag color={THEME.ice}>{activeMarketGroup?.timeLabel || 'Session'}</Tag>
        </div>

        <div className="terminal-topbar-right">
          <div className="status-card">
            <div className="status-label">Last update</div>
            <div className="status-value">{lastUpdated || 'Waiting...'}</div>
          </div>
          <Btn variant="ghost" onClick={() => window.location.href = 'menu.html'}>Exit terminal</Btn>
        </div>
      </header>

      <main className="terminal-main">
        <div className="terminal-frame">
          <aside className="terminal-sidebar">
            <div className="sidebar-inner">
              <div className="sidebar-shell">
                <div className="eyebrow">Up / Down Market Monitor</div>
                <div className="sidebar-title">
                  {activeMarketGroup?.title || 'Choose a market window'}
                </div>
                <div className="sidebar-copy">
                  Pick the session, switch between the paired outcomes, then use the shared scrubber to inspect the overlay chart and order-book state together.
                </div>
                <div className="sidebar-tags">
                  <Tag color={tone.base}>{activeContract?.tokenName || 'Outcome pending'}</Tag>
                  <Tag color={THEME.ice}>{activeMarketGroup?.timeLabel || 'No session loaded'}</Tag>
                  <Tag color={THEME.violet}>{formatResultLogic(oracle?.resultLogic, activeContract?.tokenName)}</Tag>
                </div>
              </div>

              <div className="control-card">
                <div className="control-row">
                  <div className="control-label">Market time</div>
                  <div className="control-hint">{marketGroups.length} sessions loaded</div>
                </div>
                <div className="select-shell">
                  <select
                    className="market-select"
                    value={selectedMarketKey}
                    onChange={(event) => {
                      setSelectedMarketKey(event.target.value);
                      setSelectedAssetId('');
                    }}
                  >
                    {marketGroups.map((group) => (
                      <option key={group.key} value={group.key}>
                        {group.timeLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <SnapshotScrubberCard
                selectedSnapshot={selectedSnapshot}
                selectedSnapshotIndex={selectedSnapshotIndex}
                activeSeries={activeSeries}
                selectedOracleValue={selectedOracleValue}
                selectedImbalancePct={selectedImbalancePct}
                tone={tone}
                onSelectTimestamp={setSelectedSnapshotTimestamp}
              />

              <div className="control-card">
                <div className="control-row">
                  <div className="control-label">Outcome</div>
                  <div className="control-hint">Click Up or Down</div>
                </div>
                <div className="outcome-grid">
                  {(activeMarketGroup?.contracts || []).map((contract) => {
                    const isActive = contract.assetId === activeContract?.assetId;
                    return (
                      <button
                        key={makeContractKey(contract)}
                        type="button"
                        className={`outcome-button ${isActive ? 'is-active' : 'is-inactive'}`}
                        onClick={() => setSelectedAssetId(contract.assetId)}
                      >
                        <div className="outcome-kicker">{contract.marketId}</div>
                        <div className="outcome-name">{contract.tokenName || 'Outcome'}</div>
                        <div className="outcome-copy">
                          {contract.tokenName === 'Up'
                            ? 'Tracks the contract for a higher BTC finish at the session close.'
                            : 'Tracks the contract for a lower BTC finish at the session close.'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <section className="terminal-content">
            <div className="content-stack">
              {error ? <div className="alert-banner">{error}</div> : null}

              <section className="summary-strip">
                <SummaryStat
                  label="Mid @ snap"
                  value={formatContractPrice(selectedSnapshot?.midPrice)}
                  sub={selectedSnapshot?.timestamp ? formatTimestamp(selectedSnapshot.timestamp, { compact: true }) : 'No snapshot'}
                  color={tone.base}
                />
                <SummaryStat
                  label={selectedOracleLabel}
                  value={formatCurrency(selectedOracleValue, 0)}
                  sub={selectedOracleTimestamp ? formatTimestamp(selectedOracleTimestamp, { compact: true }) : 'Latest oracle'}
                  color={THEME.ice}
                />
                <SummaryStat
                  label="Spread"
                  value={formatSpread(selectedSnapshot?.spread)}
                  sub="Best ask minus best bid"
                  color={THEME.violet}
                />
                <SummaryStat
                  label="Imbalance"
                  value={formatSignedPercent(selectedImbalancePct, 1)}
                  sub="Positive leans bid, vice versa"
                  color={Number(selectedSnapshot?.imbalance) >= 0 ? THEME.up : THEME.down}
                />
                <SummaryStat
                  label="Strike"
                  value={formatCurrency(oracle?.strikePrice, 0)}
                  sub={oracle?.rangeStart ? `Opened ${formatWindowTimestamp(oracle.rangeStart)}` : 'No strike window'}
                  color={THEME.sun}
                />
                <SummaryStat
                  label="Resolve"
                  value={formatCurrency(oracle?.resolvePrice, 0)}
                  sub={formatResultLogic(oracle?.resultLogic, activeContract?.tokenName)}
                  color={THEME.violet}
                />
              </section>

              <section className="workspace-grid">
                <section className="terminal-panel panel-fill">
                  <div className="panel-header">
                    <div>
                      <div className="eyebrow">Mid Price / BTC Overlay</div>
                      <div className="panel-title">{activeContract?.label || 'Contract view'}</div>
                      <div className="panel-copy">
                        Left axis tracks contract mid and theoretical price. Right axis tracks BTC spot, strike, and resolve price. The time window is clipped to the known session start and end.
                      </div>
                    </div>
                    <Tag color={tone.base}>{selectedSnapshot?.timestamp ? formatTimestamp(selectedSnapshot.timestamp, { compact: true }) : 'Waiting'}</Tag>
                  </div>

                  <div className="chart-meta">
                    <div className="chart-legend">
                      <span className="legend-item" style={{ color: tone.base }}>
                        <span className="legend-line" />
                        Contract mid
                      </span>
                      <span className="legend-item" style={{ color: THEME.ice }}>
                        <span className="legend-line is-dashed" />
                        Theo price
                      </span>
                      <span className="legend-item" style={{ color: THEME.sun }}>
                        <span className="legend-line" />
                        BTC spot
                      </span>
                      <span className="legend-item" style={{ color: THEME.sun }}>
                        <span className="legend-line is-dashed" />
                        BTC strike
                      </span>
                      <span className="legend-item" style={{ color: THEME.violet }}>
                        <span className="legend-line is-dotted" />
                        Resolve
                      </span>
                    </div>

                    <div className="snapshot-meta">
                      <Tag color={THEME.sun}>
                        {selectedOracleValue !== null && selectedOracleValue !== undefined
                          ? `${selectedOracleLabel} ${formatCurrency(selectedOracleValue, 0)}`
                          : 'No BTC reference'}
                      </Tag>
                      <Tag color={THEME.ice}>
                        {selectedSnapshot?.theoreticalPrice !== null && selectedSnapshot?.theoreticalPrice !== undefined
                          ? `Theo ${formatContractPrice(selectedSnapshot.theoreticalPrice)}`
                          : 'No theo'}
                      </Tag>
                      <Tag color={tone.base}>{activeSeries.length} market samples</Tag>
                    </div>
                  </div>

                  <div className="chart-shell">
                    <PriceOverlayChart
                      marketSeries={activeSeries}
                      oracleSeries={oracleSeries}
                      marketWindow={activeMarketWindow}
                      selectedTimestamp={selectedSnapshot?.timestamp}
                      strikePrice={oracle?.strikePrice}
                      resolvePrice={oracle?.resolvePrice}
                      toneColor={tone.base}
                    />
                  </div>
                </section>

                <section className="board-grid">
                  <section className="terminal-panel panel-fill">
                    <div className="panel-header">
                      <div>
                        <div className="eyebrow">Bid / Ask Depth</div>
                        <div className="panel-title">L1 at the spread, deeper levels step outward</div>
                        <div className="panel-copy">
                          Best bid and best ask stay closest to center. Deeper levels spread outward from the current snapshot selected in the sidebar scrubber.
                        </div>
                      </div>
                      <Tag color={tone.base}>{selectedSnapshot?.timestamp ? formatTimestamp(selectedSnapshot.timestamp, { compact: true }) : 'No snapshot'}</Tag>
                    </div>

                    <OrderBookPanel snapshot={selectedSnapshot} />
                  </section>

                  <section className="terminal-panel panel-fill">
                    <div className="panel-header">
                      <div>
                        <div className="eyebrow">Imbalance Snapshot</div>
                        <div className="panel-title">Pressure and flow at the selected market point</div>
                        <div className="panel-copy">
                          This compact module stays aligned with the bid/ask depth view for the currently selected snapshot.
                        </div>
                      </div>
                      <Tag color={Number(selectedSnapshot?.imbalance) >= 0 ? THEME.up : THEME.down}>
                        {formatSignedPercent(selectedImbalancePct, 1)}
                      </Tag>
                    </div>

                    <ImbalanceSnapshotPanel snapshot={selectedSnapshot} />
                  </section>
                </section>

                <section className="terminal-panel panel-fill">
                  <div className="panel-header">
                    <div>
                      <div className="eyebrow">Imbalance History</div>
                      <div className="panel-title">Pressure track for the selected session</div>
                      <div className="panel-copy">
                        This line chart uses the same session window as the overlay above, so it stops exactly at the market start and end.
                      </div>
                    </div>
                    <Tag color={Number(selectedSnapshot?.imbalance) >= 0 ? THEME.up : THEME.down}>
                      {formatSignedPercent(selectedImbalancePct, 1)}
                    </Tag>
                  </div>

                  <div className="imbalance-shell">
                    <ImbalanceHistoryChart
                      series={activeSeries}
                      marketWindow={activeMarketWindow}
                      selectedTimestamp={selectedSnapshot?.timestamp}
                    />
                  </div>
                </section>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<TerminalScreen />);
