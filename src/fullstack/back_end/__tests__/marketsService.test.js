jest.mock('../services/analyticsService', () => ({
  getMarkets: jest.fn(),
  getMarketDepthVolumeChart: jest.fn(),
  getChainlinkPrices: jest.fn(),
}));

const analyticsService = require('../services/analyticsService');
const marketsService = require('../services/marketsService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('marketsService.listContracts', () => {
  test('returns terminal-ready contracts with labels', async () => {
    analyticsService.getMarkets.mockResolvedValueOnce([
      {
        slug: 'btc-updown-15m',
        market_id: '0xmarket',
        asset_id: '123',
        market_name: 'Bitcoin Up or Down',
        token_name: 'Up',
      },
    ]);

    const result = await marketsService.listContracts({ limit: 10 });

    expect(analyticsService.getMarkets).toHaveBeenCalledWith({ limit: 10 });
    expect(result).toEqual({
      count: 1,
      data: [
        {
          slug: 'btc-updown-15m',
          marketId: '0xmarket',
          assetId: '123',
          marketName: 'Bitcoin Up or Down',
          tokenName: 'Up',
          label: 'Bitcoin Up or Down · Up',
        },
      ],
    });
  });
});

describe('marketsService.getTerminalMarketData', () => {
  test('combines market chart data with the session Chainlink series', async () => {
    analyticsService.getMarketDepthVolumeChart.mockResolvedValueOnce({
      slug: 'btc-updown-15m',
      market_id: '0xmarket',
      asset_id: '123',
      market_name: 'Bitcoin Up or Down',
      token_name: 'Up',
      strike_price: 94000,
      resolve_price: 100250,
      result_logic: 'yes',
      data: [
        {
          timestamp: '2026-04-13T12:00:00Z',
          mid_price: 0.61,
          theoretical_price: 0.58,
          spread: 0.02,
          imbalance: 0.15,
          trade_volume: {
            buy: { size: 3.5 },
            sell: { size: 1.25 },
          },
          order_book_depth: {
            bids: [{ level: 1, price: 0.6, size: 10, cumulative_size: 10 }],
            asks: [{ level: 1, price: 0.62, size: 9, cumulative_size: 9 }],
            total_bid_size: 10,
            total_ask_size: 9,
          },
        },
      ],
    });
    analyticsService.getChainlinkPrices.mockResolvedValueOnce({
      symbol: 'BTC/USD',
      data: [
        { update_timestamp: '2026-04-13T12:00:00Z', value: 94000, symbol: 'BTC/USD' },
        { update_timestamp: '2026-04-13T12:00:01Z', value: 100000, symbol: 'BTC/USD' },
      ],
    });

    const result = await marketsService.getTerminalMarketData({
      marketId: '0xmarket',
      assetId: '123',
      limit: 50,
    });

    expect(analyticsService.getMarketDepthVolumeChart).toHaveBeenCalledWith({
      marketId: '0xmarket',
      assetId: '123',
      limit: 50,
    });
    expect(analyticsService.getChainlinkPrices).toHaveBeenCalledWith({
      symbol: 'btcusd',
      start: '2026-04-13T12:00:00.000Z',
      end: '2026-04-13T12:00:01.000Z',
      latest: false,
      limit: 600,
    });
    expect(result.contract).toEqual({
      slug: 'btc-updown-15m',
      marketId: '0xmarket',
      assetId: '123',
      marketName: 'Bitcoin Up or Down',
      tokenName: 'Up',
      label: 'Bitcoin Up or Down · Up',
    });
    expect(result.oracle.symbol).toBe('BTC/USD');
    expect(result.oracle.latest).toBe(100000);
    expect(result.oracle.previous).toBe(94000);
    expect(result.oracle.changePct).toBeCloseTo(6.3830, 4);
    expect(result.oracle.strikePrice).toBe(94000);
    expect(result.oracle.resolvePrice).toBe(100250);
    expect(result.oracle.resultLogic).toBe('yes');
    expect(result.oracle.rangeStart).toBe('2026-04-13T12:00:00Z');
    expect(result.oracle.rangeEnd).toBe('2026-04-13T12:00:01Z');
    expect(result.oracle.series).toEqual([
      { timestamp: '2026-04-13T12:00:00Z', value: 94000, symbol: 'BTC/USD' },
      { timestamp: '2026-04-13T12:00:01Z', value: 100000, symbol: 'BTC/USD' },
    ]);
    expect(result.latest).toEqual({
      timestamp: '2026-04-13T12:00:00Z',
      midPrice: 0.61,
      theoreticalPrice: 0.58,
      spread: 0.02,
      imbalance: 0.15,
      totalBidSize: 10,
      totalAskSize: 9,
      buySize: 3.5,
      sellSize: 1.25,
      bids: [{ level: 1, price: 0.6, size: 10, cumulativeSize: 10 }],
      asks: [{ level: 1, price: 0.62, size: 9, cumulativeSize: 9 }],
    });
  });

  test('returns a fallback contract when no chart rows exist yet', async () => {
    analyticsService.getMarketDepthVolumeChart.mockResolvedValueOnce({
      count: 0,
      data: [],
    });
    analyticsService.getChainlinkPrices.mockResolvedValueOnce({
      symbol: 'BTC/USD',
      data: [],
    });

    const result = await marketsService.getTerminalMarketData({
      marketId: '0xempty',
      assetId: '999',
      limit: 25,
    });

    expect(result.contract).toEqual({
      slug: null,
      marketId: '0xempty',
      assetId: '999',
      marketName: null,
      tokenName: null,
      label: '0xempty / 999',
    });
    expect(result.count).toBe(0);
    expect(result.series).toEqual([]);
    expect(result.latest).toBeNull();
    expect(result.oracle.latest).toBeNull();
    expect(result.oracle.strikePrice).toBeNull();
    expect(result.oracle.resolvePrice).toBeNull();
    expect(result.oracle.series).toEqual([]);
  });
});
