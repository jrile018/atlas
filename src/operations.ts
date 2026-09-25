export type SourceStatus = 'available' | 'degraded' | 'unavailable';
export type OverviewStatus = 'ok' | 'degraded' | 'unavailable';

export interface MarketBar {
  time: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DatasetContract {
  name: string;
  role: string;
  fields?: string[];
  mode?: string;
  status?: 'available' | 'empty' | 'missing' | 'error' | 'not_applicable' | 'unavailable';
  rowCount?: number | null;
  sourceRowCount?: number;
  asOf?: string | null;
  message?: string;
}

export interface Freshness {
  status: 'current' | 'stale' | 'unknown';
  ageCalendarDays: number | null;
  toleranceDays: number;
}

export interface DataNginSource {
  status: SourceStatus;
  transport: string;
  asOf: string | null;
  freshness: Freshness;
  coverage: {
    earliestDate: string | null;
    latestDate: string | null;
    symbolCount: number;
    symbols: string[];
  } | null;
  sample: {
    symbols: string[];
    lookbackDays: number;
    rowCount: number;
    bars: MarketBar[];
    coverageBySymbol: Array<{
      symbol: string;
      rowCount: number;
      firstBar: string | null;
      lastBar: string | null;
      freshness: Freshness;
    }>;
  } | null;
  datasets: DatasetContract[];
  message?: string;
}

export interface StrategySummary {
  id: string;
  name: string;
  currentValue: number;
  returnPercent: number;
  volatility: number;
  sharpeRatio: number;
  annualizedReturn: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  costBasis: number;
  currentValue: number;
  percentOfTotal: number;
}

export interface RebalanceExecution {
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  notional: number;
  commission: number;
  date: string | null;
}

export interface TradeSignal {
  strategy_id?: string;
  portfolio_id?: string;
  symbol: string;
  signal_value: number;
  timestamp: string;
  strategy_name: string;
  snapshot_row_count?: number;
}

export interface CostedRebalance {
  exec_id: string;
  order_id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  execution_time: string;
  commissions_fees: number;
  implicit_price_impact: number;
  slippage_market_impact: number;
  total_transaction_costs: number;
  is_partial: boolean;
  strategy_name: string;
}

export interface BacktestSummary {
  run_id: string;
  portfolio_id: string;
  start_date: string;
  end_date: string;
  total_return: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  volatility: number;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  var_95: number;
  cvar_95: number;
  [key: string]: string | number | null;
}

export interface DatasetCapability {
  mode: string;
  status: 'available' | 'empty' | 'missing' | 'error' | 'not_applicable' | 'unavailable';
  rowCount: number | null;
  sourceRowCount?: number;
  asOf: string | null;
  message?: string;
}

export interface OperationalPosition {
  strategy_id: string;
  portfolio_id: string;
  strategy_name: string;
  date: string;
  symbol: string;
  quantity: number;
  average_price: number;
  daily_unrealized_pnl: number;
  daily_realized_pnl: number;
  last_update: string;
  updated_at: string;
  snapshot_row_count?: number;
}

export interface OperationalEquityPoint {
  timestamp: string;
  equity: number;
}

export interface InstrumentMetadata {
  name: string;
  databento_symbol: string;
  ib_symbol: string;
  asset_type: string;
  sector: string;
  exchange: string;
  contract_size: number;
  minimum_price_fluctuation: number;
  tick_size: string;
  trading_hours_est: string;
  overnight_initial_margin: number;
  overnight_maintenance_margin: number;
  intraday_initial_margin: number;
  intraday_maintenance_margin: number;
  units: string;
  data_provider: string;
  dataset: string;
  contract_months: string;
}

export interface LiveRunMetadata {
  date: string | null;
  strategy_allocations: Record<string, number>;
  allocation_count: number;
  strategy_count: number | null;
  allocation_total: number;
}

export interface SelectedBacktest {
  scope: 'portfolio';
  summary: BacktestSummary;
  equityCurve: Array<Record<string, string | number | null>>;
  positionSnapshot: Array<Record<string, string | number | null>>;
  modeledExecutions: Array<Record<string, string | number | boolean | null>>;
  runMetadata: Array<Record<string, string | number | null>>;
}

export interface TradeOperationalArtifacts {
  capabilities: Record<string, DatasetCapability>;
  liveMetrics: Record<string, string | number | null> | null;
  equityHistory: OperationalEquityPoint[];
  positions: OperationalPosition[];
  signals: TradeSignal[];
  rebalanceExecutions: CostedRebalance[];
  liveRunMetadata: LiveRunMetadata | null;
  instrumentMetadata: InstrumentMetadata[];
  backtests: BacktestSummary[];
  selectedBacktest: SelectedBacktest | null;
}

export interface StrategyDetail {
  id: string;
  name: string;
  currentValue: number;
  returnPercent: number;
  lastUpdate: string;
  positions: Position[];
  executions: RebalanceExecution[];
  historicalData: Array<{ date: string; value: number }>;
  metrics: {
    volatility: number;
    sharpeRatio: number;
    annualizedReturn: number;
    maxDrawdown: number;
    grossLeverage: number;
    netLeverage: number;
    marginPosted: number;
    totalNotional: number;
    unrealizedPnL: number;
    realizedPnL: number;
    totalCommissions: number;
    cashAvailable: number;
    currentPortfolioValue: number;
  };
}

export interface TradeNginSource {
  status: SourceStatus;
  transport: string;
  asOf: string | null;
  freshness: Freshness;
  configuredStrategyCount: number;
  strategies: StrategySummary[];
  selectedStrategyId: string | null;
  selectedStrategy: StrategyDetail | null;
  operational: TradeOperationalArtifacts;
  datasets: DatasetContract[];
  nonPersisted: DatasetContract[];
  message?: string;
}

export interface OperationsOverview {
  schemaVersion: string;
  runtimeMode: 'live' | 'seeded-demo';
  generatedAt: string;
  status: OverviewStatus;
  dataNgin: DataNginSource;
  tradeNgin: TradeNginSource;
  lineage: Array<{
    from: string;
    to: string;
    contract: string;
    fields: string[];
  }>;
  limitations: string[];
}

export interface OverviewQuery {
  strategyId?: string;
  symbol?: string;
}

export class OperationsApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OperationsApiError';
    this.status = status;
  }
}

const DEFAULT_API_BASE = '/research-api';

function apiBase(): string {
  return (import.meta.env.VITE_RESEARCH_API_URL || DEFAULT_API_BASE).replace(/\/$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasSourceStatus(value: unknown): boolean {
  return value === 'available' || value === 'degraded' || value === 'unavailable';
}

function hasFreshness(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    ['current', 'stale', 'unknown'].includes(String(value.status))
    && (value.ageCalendarDays === null || typeof value.ageCalendarDays === 'number')
    && typeof value.toleranceDays === 'number'
  );
}

function hasDataNginContract(value: unknown): boolean {
  if (!isRecord(value) || !hasSourceStatus(value.status) || !hasFreshness(value.freshness)) return false;
  if (!Array.isArray(value.datasets)) return false;
  if (value.coverage !== null) {
    if (!isRecord(value.coverage) || !Array.isArray(value.coverage.symbols)) return false;
  }
  if (value.sample !== null) {
    if (!isRecord(value.sample) || !Array.isArray(value.sample.symbols) || !Array.isArray(value.sample.bars)) return false;
  }
  return true;
}

function hasTradeNginContract(value: unknown): boolean {
  if (!isRecord(value) || !hasSourceStatus(value.status) || !hasFreshness(value.freshness)) return false;
  if (!Array.isArray(value.strategies) || !Array.isArray(value.datasets)) return false;
  if (!isRecord(value.operational)) return false;
  if (
    !Array.isArray(value.operational.signals)
    || !Array.isArray(value.operational.rebalanceExecutions)
    || !Array.isArray(value.operational.equityHistory)
    || !Array.isArray(value.operational.positions)
    || !Array.isArray(value.operational.instrumentMetadata)
    || !Array.isArray(value.operational.backtests)
  ) return false;
  if (!Array.isArray(value.nonPersisted)) return false;
  if (value.selectedStrategy !== null) {
    if (!isRecord(value.selectedStrategy)) return false;
    if (
      !Array.isArray(value.selectedStrategy.positions)
      || !Array.isArray(value.selectedStrategy.executions)
      || !Array.isArray(value.selectedStrategy.historicalData)
      || !isRecord(value.selectedStrategy.metrics)
    ) return false;
  }
  return true;
}

function isOverview(value: unknown): value is OperationsOverview {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<OperationsOverview>;
  return (
    candidate.schemaVersion === '1.1'
    && (candidate.runtimeMode === 'live' || candidate.runtimeMode === 'seeded-demo')
    && typeof candidate.generatedAt === 'string'
    && ['ok', 'degraded', 'unavailable'].includes(candidate.status ?? '')
    && hasDataNginContract(candidate.dataNgin)
    && hasTradeNginContract(candidate.tradeNgin)
    && Array.isArray(candidate.lineage)
    && candidate.lineage.every((edge) => (
      isRecord(edge)
      && typeof edge.from === 'string'
      && typeof edge.to === 'string'
      && typeof edge.contract === 'string'
      && Array.isArray(edge.fields)
    ))
    && Array.isArray(candidate.limitations)
    && candidate.limitations.every((item) => typeof item === 'string')
  );
}

export async function fetchOperationsOverview(
  query: OverviewQuery = {},
  fetcher: typeof fetch = fetch,
): Promise<OperationsOverview> {
  const params = new URLSearchParams({ lookback_days: '14', history_points: '260' });
  if (query.strategyId) params.set('strategy_id', query.strategyId);
  if (query.symbol) params.set('symbol', query.symbol);

  const response = await fetcher(`${apiBase()}/operations/overview?${params}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const message = response.status === 401
      ? 'Research API authentication is required.'
      : response.status === 403
        ? 'Your account does not have access to the internal operations view.'
        : response.status === 429
          ? 'The operations refresh is rate limited. Wait briefly and try again.'
          : 'The operations overview could not be loaded.';
    throw new OperationsApiError(
      message,
      response.status,
    );
  }

  const payload: unknown = await response.json();
  if (!isOverview(payload)) {
    throw new OperationsApiError('Research API returned an unsupported overview contract.', 502);
  }
  return payload;
}

export async function createLocalDevSession(fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(`${apiBase()}/auth/dev-login`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new OperationsApiError(
      response.status === 404
        ? 'Local dev login is disabled. Sign in through the Research API instead.'
        : 'Could not create a local Research API session.',
      response.status,
    );
  }
}

export function latestBars(bars: MarketBar[], limit = 8): MarketBar[] {
  return [...bars]
    .sort((left, right) => right.time.localeCompare(left.time) || left.symbol.localeCompare(right.symbol))
    .slice(0, limit);
}

export function ratioPercent(value: number): number {
  return value * 100;
}
