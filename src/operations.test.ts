import { describe, expect, it, vi } from 'vitest';

import { fetchOperationsOverview, latestBars, ratioPercent } from './operations';

const overview = {
  schemaVersion: '1.1',
  runtimeMode: 'live',
  generatedAt: '2026-09-24T12:00:00+00:00',
  status: 'ok',
  dataNgin: {
    status: 'available',
    transport: 'GraphQL',
    asOf: '2026-09-23',
    freshness: { status: 'current', ageCalendarDays: 1, toleranceDays: 4 },
    coverage: { earliestDate: '2020-01-01', latestDate: '2026-09-23', symbolCount: 1, symbols: ['MES'] },
    sample: { symbols: ['MES'], lookbackDays: 14, rowCount: 1, bars: [], coverageBySymbol: [] },
    datasets: [],
  },
  tradeNgin: {
    status: 'available',
    transport: 'PostgreSQL read model',
    asOf: '2026-09-23',
    freshness: { status: 'current', ageCalendarDays: 1, toleranceDays: 4 },
    configuredStrategyCount: 0,
    strategies: [],
    selectedStrategyId: null,
    selectedStrategy: null,
    operational: {
      capabilities: {},
      liveMetrics: null,
      equityHistory: [],
      positions: [],
      signals: [],
      rebalanceExecutions: [],
      liveRunMetadata: null,
      instrumentMetadata: [],
      backtests: [],
      selectedBacktest: null,
    },
    datasets: [],
    nonPersisted: [],
  },
  lineage: [],
  limitations: [],
};

describe('operations transport', () => {
  it('uses one credentialed snapshot request with bounded query defaults', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(overview), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await fetchOperationsOverview({ strategyId: 'trend', symbol: 'MES' }, fetcher);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain('/operations/overview?');
    expect(String(url)).toContain('strategy_id=trend');
    expect(String(url)).toContain('symbol=MES');
    expect(String(url)).toContain('history_points=260');
    expect(init).toMatchObject({ credentials: 'include' });
  });

  it('distinguishes authentication from service failures', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 401 }));

    await expect(fetchOperationsOverview({}, fetcher)).rejects.toMatchObject({
      status: 401,
      message: 'Research API authentication is required.',
    });
  });

  it('distinguishes forbidden access from authentication', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 403 }));

    await expect(fetchOperationsOverview({}, fetcher)).rejects.toMatchObject({
      status: 403,
      message: 'Your account does not have access to the internal operations view.',
    });
  });

  it('rejects an unsupported response contract', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
    }));

    await expect(fetchOperationsOverview({}, fetcher)).rejects.toMatchObject({ status: 502 });
  });

  it('rejects an incomplete nested response contract', async () => {
    const malformed = { ...overview, tradeNgin: { status: 'available' } };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(malformed), {
      status: 200,
    }));

    await expect(fetchOperationsOverview({}, fetcher)).rejects.toMatchObject({ status: 502 });
  });
});

describe('latestBars', () => {
  it('sorts newest first and preserves symbol order for equal timestamps', () => {
    const bars = [
      { time: '2026-09-22', symbol: 'MNQ', open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: '2026-09-23', symbol: 'MNQ', open: 2, high: 2, low: 2, close: 2, volume: 2 },
      { time: '2026-09-23', symbol: 'MES', open: 3, high: 3, low: 3, close: 3, volume: 3 },
    ];

    expect(latestBars(bars, 2).map((bar) => bar.symbol)).toEqual(['MES', 'MNQ']);
  });
});

describe('ratioPercent', () => {
  it('converts Trade Ngin ratio fields at the presentation boundary', () => {
    expect(ratioPercent(0.15)).toBe(15);
    expect(ratioPercent(-0.0725)).toBeCloseTo(-7.25);
  });
});
