const parseTimeout = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const gamma = {
  baseUrl: process.env.GAMMA_API_BASE_URL || 'https://gamma-api.polymarket.com',
  paths: {
    events: process.env.GAMMA_EVENTS_PATH || '/events',
    series: process.env.GAMMA_SERIES_PATH || '/series',
    trades: process.env.GAMMA_TRADES_PATH || '/trades',
  },
};

const dataService = {
  baseUrl: process.env.DATA_SERVICE_API_BASE_URL || 'http://localhost:8000',
  paths: {
    chainlinkPrices: process.env.DATA_SERVICE_CHAINLINK_PATH || '/chainlink/prices',
    binancePrices: process.env.DATA_SERVICE_BINANCE_PATH || '/prices/binance',
    markets: process.env.DATA_SERVICE_MARKETS_PATH || '/markets',
    marketDepthVolumeChart:
      process.env.DATA_SERVICE_MARKET_DEPTH_VOLUME_CHART_PATH || '/markets/depth-volume-chart',
    data: process.env.DATA_SERVICE_DATA_PATH || '/data',
  },
};

module.exports = {
  gamma,
  dataService,
  requestTimeoutMs: parseTimeout(process.env.UPSTREAM_TIMEOUT_MS, 10000),
};
