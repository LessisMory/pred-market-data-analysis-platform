const analyticsService = require('./analyticsService');

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildContractLabel = ({ marketName, tokenName, slug, marketId, assetId }) => {
  if (marketName && tokenName) {
    return `${marketName} · ${tokenName}`;
  }

  if (marketName) {
    return marketName;
  }

  if (slug) {
    return slug;
  }

  const fallback = [marketId, assetId].filter(Boolean).join(' / ');
  return fallback || 'Unknown Contract';
};

const normalizeContract = (record = {}, fallback = {}) => {
  const contract = {
    slug: record.slug ?? fallback.slug ?? null,
    marketId: record.marketId ?? record.market_id ?? fallback.marketId ?? fallback.market_id ?? null,
    assetId: record.assetId ?? record.asset_id ?? fallback.assetId ?? fallback.asset_id ?? null,
    marketName:
      record.marketName ?? record.market_name ?? fallback.marketName ?? fallback.market_name ?? null,
    tokenName:
      record.tokenName ?? record.token_name ?? fallback.tokenName ?? fallback.token_name ?? null,
  };

  return {
    ...contract,
    label: buildContractLabel(contract),
  };
};

const normalizeDepthLevel = (level = {}) => ({
  level: toFiniteNumber(level.level),
  price: toFiniteNumber(level.price),
  size: toFiniteNumber(level.size),
  cumulativeSize: toFiniteNumber(level.cumulativeSize ?? level.cumulative_size),
});

const normalizeSeriesPoint = (point = {}) => {
  const orderBookDepth = point.order_book_depth || {};
  const tradeVolume = point.trade_volume || {};

  return {
    timestamp: point.timestamp || null,
    midPrice: toFiniteNumber(point.midPrice ?? point.mid_price),
    theoreticalPrice: toFiniteNumber(point.theoreticalPrice ?? point.theoretical_price),
    spread: toFiniteNumber(point.spread),
    imbalance: toFiniteNumber(point.imbalance),
    totalBidSize: toFiniteNumber(orderBookDepth.totalBidSize ?? orderBookDepth.total_bid_size),
    totalAskSize: toFiniteNumber(orderBookDepth.totalAskSize ?? orderBookDepth.total_ask_size),
    buySize: toFiniteNumber(tradeVolume.buy?.size),
    sellSize: toFiniteNumber(tradeVolume.sell?.size),
    bids: Array.isArray(orderBookDepth.bids) ? orderBookDepth.bids.map(normalizeDepthLevel) : [],
    asks: Array.isArray(orderBookDepth.asks) ? orderBookDepth.asks.map(normalizeDepthLevel) : [],
  };
};

const roundNumber = (value, digits = 4) => {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value.toFixed(digits));
};

const buildOracle = (series = []) => {
  const latestPoint = series[series.length - 1] || null;
  const previousPoint = series.length > 1 ? series[series.length - 2] : null;
  const latest = toFiniteNumber(latestPoint?.value);
  const previous = toFiniteNumber(previousPoint?.value);

  let changePct = null;
  if (latest !== null && previous !== null && previous !== 0) {
    changePct = roundNumber(((latest - previous) / previous) * 100, 4);
  }

  return {
    symbol: latestPoint?.symbol || previousPoint?.symbol || null,
    latest,
    previous,
    changePct,
    timestamp: latestPoint?.timestamp || null,
  };
};

const normalizeOraclePoint = (point = {}) => ({
  timestamp: point.update_timestamp || point.timestamp || null,
  value: toFiniteNumber(point.value),
  symbol: point.symbol || null,
});

const buildOracleWindow = (series = [], limit = 100) => {
  const timestamps = series
    .map((point) => point?.timestamp)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  if (!timestamps.length) {
    return null;
  }

  const start = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const end = last.getTime() > start.getTime() ? last : new Date(last.getTime() + 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    limit: Math.min(Math.max(limit * 12, 180), 2000),
  };
};

const asArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

exports.listContracts = async ({ limit }) => {
  const payload = await analyticsService.getMarkets({ limit });
  const data = asArray(payload).map((record) => normalizeContract(record));

  return {
    count: data.length,
    data,
  };
};

exports.getTerminalMarketData = async ({ marketId, assetId, limit }) => {
  const chartPayload = await analyticsService.getMarketDepthVolumeChart({
    marketId,
    assetId,
    limit,
  });
  const series = asArray(chartPayload).map((point) => normalizeSeriesPoint(point));
  const oracleWindow = buildOracleWindow(series, limit);
  const oracleSeriesPayload = oracleWindow
    ? await analyticsService.getChainlinkPrices({
        symbol: 'btcusd',
        start: oracleWindow.start,
        end: oracleWindow.end,
        latest: false,
        limit: oracleWindow.limit,
      })
    : { data: [] };
  const contract = normalizeContract(chartPayload, { marketId, assetId });
  const oracleSeries = asArray(oracleSeriesPayload)
    .map((point) => normalizeOraclePoint(point))
    .filter((point) => point.timestamp && point.value !== null);
  const oracle = buildOracle(oracleSeries);
  const chartStrikePrice = toFiniteNumber(chartPayload?.strike_price ?? chartPayload?.strikePrice);
  const strikePrice = chartStrikePrice ?? (oracleSeries.length ? oracleSeries[0].value : null);
  const resolvePrice = toFiniteNumber(chartPayload?.resolve_price ?? chartPayload?.resolvePrice);
  const resultLogic = chartPayload?.result_logic ?? chartPayload?.resultLogic ?? null;

  return {
    contract,
    oracle: {
      ...oracle,
      strikePrice,
      resolvePrice,
      resultLogic,
      rangeStart: oracleSeries[0]?.timestamp || null,
      rangeEnd: oracleSeries[oracleSeries.length - 1]?.timestamp || null,
      series: oracleSeries,
    },
    count: series.length,
    series,
    latest: series.length ? series[series.length - 1] : null,
  };
};
