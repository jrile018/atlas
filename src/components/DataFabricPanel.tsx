import { AlertTriangle, Database, Link2, RefreshCw, ServerCog } from 'lucide-react';

import {
  latestBars,
  ratioPercent,
  type DatasetCapability,
  type Freshness,
  type OperationsOverview,
  type OverviewQuery,
  type SourceStatus,
} from '../operations';
import { PanelHeading } from './PanelHeading';
import { TradeEvidencePanel } from './TradeEvidencePanel';

interface DataFabricPanelProps {
  overview: OperationsOverview | null;
  loading: boolean;
  refreshing: boolean;
  connecting: boolean;
  authRequired: boolean;
  error: string | null;
  onRefresh: (query?: OverviewQuery) => Promise<void>;
  onConnect: () => Promise<void>;
}

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

function sourceLabel(status: SourceStatus | undefined, freshness?: Freshness): string {
  if (freshness?.status === 'stale') return `Stale · ${freshness.ageCalendarDays}d`;
  if (freshness?.status === 'unknown' && status !== 'unavailable') return 'Freshness unknown';
  if (status === 'available') return 'Connected';
  if (status === 'degraded') return 'Partial';
  return 'Unavailable';
}

function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toLocaleDateString();
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function datasetCount(capability: DatasetCapability | undefined, fallback: number): number | null {
  if (!capability || (capability.status !== 'available' && capability.status !== 'empty')) return null;
  return capability.sourceRowCount ?? capability.rowCount ?? fallback;
}

function combinedMoney(...values: unknown[]): string {
  const observed = values.map(finiteNumber).filter((value): value is number => value !== null);
  return observed.length ? money.format(observed.reduce((total, value) => total + value, 0)) : '—';
}

export function DataFabricPanel({
  overview,
  loading,
  refreshing,
  connecting,
  authRequired,
  error,
  onRefresh,
  onConnect,
}: DataFabricPanelProps) {
  const data = overview?.dataNgin;
  const trade = overview?.tradeNgin;
  const strategy = trade?.selectedStrategy;
  const operational = trade?.operational;
  const bars = latestBars(data?.sample?.bars ?? [], 200);
  const positions = operational?.positions.slice(0, 100) ?? [];
  const fallbackPositions = strategy?.positions.slice(0, 100) ?? [];
  const equity = operational?.equityHistory.length
    ? [...operational.equityHistory].slice(-100).reverse().map((point) => ({ date: point.timestamp, value: point.equity }))
    : [...(strategy?.historicalData ?? [])].slice(-100).reverse();
  const executions = operational?.rebalanceExecutions.length
    ? operational.rebalanceExecutions.slice(0, 8).map((execution) => ({
        id: execution.exec_id,
        time: execution.execution_time,
        symbol: execution.symbol,
        side: execution.side,
        quantity: execution.quantity,
        totalCost: execution.total_transaction_costs,
      }))
    : (strategy?.executions.slice(0, 8).map((execution, index) => ({
        id: `${execution.symbol}-${execution.date}-${index}`,
        time: execution.date,
        symbol: execution.symbol,
        side: execution.side,
        quantity: execution.quantity,
        totalCost: execution.commission,
      })) ?? []);
  const signals = operational?.signals.slice(0, 8) ?? [];
  const backtests = operational?.backtests.slice(0, 8) ?? [];
  const status = overview?.status ?? 'unavailable';
  const marketSelection = data?.sample?.symbols.length === 1 ? data.sample.symbols[0] : '';
  const sourceMessages = [data?.message, trade?.message].filter((message): message is string => Boolean(message));
  const liveValue = finiteNumber(operational?.liveMetrics?.current_portfolio_value) ?? strategy?.currentValue ?? null;
  const persistedSharpe = finiteNumber(operational?.liveMetrics?.sharpe_ratio);
  const liveSharpe = persistedSharpe ?? strategy?.metrics.sharpeRatio ?? null;
  const sharpeLabel = liveSharpe === null
    ? 'No Sharpe metric available'
    : persistedSharpe !== null
      ? `${liveSharpe.toFixed(2)} persisted Sharpe`
      : `${liveSharpe.toFixed(2)} derived Sharpe (annualized return ÷ volatility)`;
  const positionCount = datasetCount(
    operational?.capabilities['trading.positions'],
    operational?.positions.length ?? 0,
  );
  const signalCount = datasetCount(
    operational?.capabilities['trading.signals'],
    operational?.signals.length ?? 0,
  );
  const backtestCount = datasetCount(
    operational?.capabilities['backtest.results'],
    operational?.backtests.length ?? 0,
  );
  const artifactCounts = signalCount === null && backtestCount === null
    ? 'Operational artifacts unavailable'
    : `${signalCount ?? '—'} latest signals · ${backtestCount ?? '—'} portfolio backtests`;

  return (
    <section className="panel fabric-panel" aria-label="Connected operational data fabric">
      <PanelHeading
        eyebrow={overview?.runtimeMode === 'seeded-demo' ? 'Seeded local system demonstration' : 'Connected persisted system context'}
        title="Atlas operational data fabric"
        aside={(
          <div className="fabric-actions">
            <span className={`fabric-mode ${status}`}>{loading ? 'Checking' : status}</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => void onRefresh()}
              disabled={loading || refreshing}
            >
              <RefreshCw aria-hidden="true" size={13} className={refreshing ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        )}
      />

      {(error || authRequired) && (
        <div className="fabric-notice" role="status">
          <AlertTriangle aria-hidden="true" size={16} />
          <div>
            <strong>{authRequired ? 'Research API session required' : 'Live services are not connected'}</strong>
            <span>{error ?? 'Authenticate to load internal operations data.'}</span>
          </div>
          {authRequired && (
            <button type="button" onClick={() => void onConnect()} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect local dev'}
            </button>
          )}
        </div>
      )}

      {sourceMessages.length > 0 && (
        <div className="fabric-source-messages" role="status">
          {sourceMessages.map((message) => <span key={message}>{message}</span>)}
        </div>
      )}

      <div className="lineage-row" aria-label="Source status">
        <article>
          <Database aria-hidden="true" size={18} />
          <div><strong>Data Ngin</strong><span>Stored cleaned OHLCV · identity caveat</span></div>
          <i className={data?.status === 'available' ? 'online' : data?.status === 'degraded' ? 'partial' : 'offline'}>{sourceLabel(data?.status, data?.freshness)}</i>
        </article>
        <Link2 aria-hidden="true" size={16} />
        <article>
          <ServerCog aria-hidden="true" size={18} />
          <div><strong>Research API</strong><span>Authenticated read model</span></div>
          <i className={overview ? 'online' : 'offline'}>{overview ? 'Connected' : 'Unavailable'}</i>
        </article>
        <Link2 aria-hidden="true" size={16} />
        <article>
          <Database aria-hidden="true" size={18} />
          <div><strong>Trade Ngin</strong><span>Portfolio state + rebalances</span></div>
          <i className={trade?.status === 'available' ? 'online' : trade?.status === 'degraded' ? 'partial' : 'offline'}>{sourceLabel(trade?.status, trade?.freshness)}</i>
        </article>
      </div>

      {overview?.lineage.length ? (
        <div className="fabric-lineage" aria-label="Declared integration path">
          {overview.lineage.map((edge) => (
            <span key={`${edge.from}-${edge.to}-${edge.contract}`}>
              <strong>{edge.from} → {edge.to}</strong>
              <small>{edge.contract}</small>
              <em>{edge.fields.join(' · ')}</em>
            </span>
          ))}
        </div>
      ) : null}

      <div className="fabric-toolbar">
        <label>
          Market sample
          <select
            value={marketSelection}
            disabled={!data?.coverage?.symbols.length}
            onChange={(event) => void onRefresh({
              strategyId: trade?.selectedStrategyId ?? undefined,
              symbol: event.target.value || undefined,
            })}
          >
            {!data?.coverage?.symbols.length && <option value="">No symbols</option>}
            {data?.sample && data.sample.symbols.length > 1 && (
              <option value="">Sample of {data.sample.symbols.length} symbols</option>
            )}
            {data?.coverage?.symbols.map((symbol) => <option key={symbol}>{symbol}</option>)}
          </select>
        </label>
        <label>
          Trade strategy
          <select
            value={trade?.selectedStrategyId ?? ''}
            disabled={!trade?.strategies.length}
            onChange={(event) => void onRefresh({
              strategyId: event.target.value || undefined,
              symbol: data?.sample?.symbols[0],
            })}
          >
            {!trade?.strategies.length && <option value="">No strategies</option>}
            {trade?.strategies.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="fabric-asof">
          <span>Snapshot generated</span>
          <strong>{overview ? new Date(overview.generatedAt).toLocaleString() : '—'}</strong>
        </div>
      </div>

      <div className="fabric-metrics">
        <div><span>Market coverage</span><strong>{data?.coverage?.symbolCount ?? '—'} symbols</strong><small>{shortDate(data?.coverage?.earliestDate)} → {shortDate(data?.coverage?.latestDate)}</small></div>
        <div><span>Market sample</span><strong>{data?.sample?.rowCount ?? '—'} bars</strong><small>{data?.sample ? `${data.sample.lookbackDays} calendar days` : 'No source response'}</small></div>
        <div><span>Portfolio value</span><strong>{liveValue === null ? '—' : money.format(liveValue)}</strong><small>{sharpeLabel}</small></div>
        <div><span>Book state</span><strong>{positionCount === null ? '—' : `${positionCount} strategy positions`}</strong><small>{artifactCounts}</small></div>
      </div>

      {data?.sample?.coverageBySymbol.length ? (
        <div className="fabric-sample-coverage" aria-label="Market sample coverage by symbol">
          {data.sample.coverageBySymbol.map((item) => (
            <span key={item.symbol}>
              <strong>{item.symbol}</strong>
              <small>{item.rowCount} rows · {shortDate(item.firstBar)} → {shortDate(item.lastBar)}</small>
              <i className={item.freshness.status}>{item.freshness.status}</i>
            </span>
          ))}
        </div>
      ) : null}

      <div className="fabric-tables">
        <article>
          <div className="fabric-table-title"><span>Data Ngin · latest bars</span><small>cleaned OHLCV</small></div>
          <div className="fabric-scroll">
            <table>
              <thead><tr><th>As of</th><th>Symbol</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th></tr></thead>
              <tbody>
                {bars.length ? bars.map((bar) => (
                  <tr key={`${bar.symbol}-${bar.time}`}>
                    <td>{shortDate(bar.time)}</td><th scope="row">{bar.symbol}</th><td>{number.format(bar.open)}</td><td>{number.format(bar.high)}</td><td>{number.format(bar.low)}</td><td>{number.format(bar.close)}</td><td>{number.format(bar.volume)}</td>
                  </tr>
                )) : <tr><td colSpan={7}>No bounded market sample available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Trade Ngin · positions</span><small>per-strategy latest rows</small></div>
          <div className="fabric-scroll">
            <table>
              <thead><tr><th>Strategy</th><th>Symbol</th><th>Qty</th><th>Basis</th><th>Daily P&amp;L</th></tr></thead>
              <tbody>
                {positions.length ? positions.map((position) => (
                  <tr key={`${position.strategy_name}-${position.symbol}`}>
                    <td>{position.strategy_name}</td><th scope="row">{position.symbol}</th><td>{number.format(position.quantity)}</td><td>{number.format(position.average_price)}</td><td>{combinedMoney(position.daily_unrealized_pnl, position.daily_realized_pnl)}</td>
                  </tr>
                )) : fallbackPositions.length ? fallbackPositions.map((position) => (
                  <tr key={position.symbol}>
                    <td>Legacy view</td><th scope="row">{position.symbol}</th><td>{number.format(position.quantity)}</td><td>{number.format(position.costBasis)}</td><td>—</td>
                  </tr>
                )) : <tr><td colSpan={5}>No current per-strategy positions available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Trade Ngin · signals</span><small>persisted final forecast</small></div>
          <div className="fabric-scroll">
            <table>
              <thead><tr><th>Time</th><th>Symbol</th><th>Strategy</th><th>Value</th></tr></thead>
              <tbody>
                {signals.length ? signals.map((signal, index) => (
                  <tr key={`${signal.symbol}-${signal.timestamp}-${signal.strategy_name}-${index}`}>
                    <td>{shortDate(signal.timestamp)}</td><th scope="row">{signal.symbol}</th><td>{signal.strategy_name}</td><td>{number.format(signal.signal_value)}</td>
                  </tr>
                )) : <tr><td colSpan={4}>No recent persisted signals available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Trade Ngin · modeled rebalances</span><small>not broker-confirmed fills</small></div>
          <div className="fabric-scroll">
            <table>
              <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Cost</th></tr></thead>
              <tbody>
                {executions.length ? executions.map((execution, index) => (
                  <tr key={`${execution.id}-${index}`}>
                    <td>{shortDate(execution.time)}</td><th scope="row">{execution.symbol}</th><td>{execution.side}</td><td>{number.format(execution.quantity)}</td><td>{money.format(execution.totalCost)}</td>
                  </tr>
                )) : <tr><td colSpan={5}>No recent rebalance records available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Trade Ngin · backtests</span><small>bounded recent summaries</small></div>
          <div className="fabric-scroll">
            <table>
              <thead><tr><th>End</th><th>Run</th><th>Return</th><th>Sharpe</th><th>Drawdown</th></tr></thead>
              <tbody>
                {backtests.length ? backtests.map((run) => (
                  <tr key={`${run.portfolio_id}-${run.run_id}`}>
                    <td>{shortDate(run.end_date)}</td><th scope="row">{run.run_id}</th><td>{number.format(ratioPercent(run.total_return))}%</td><td>{number.format(run.sharpe_ratio)}</td><td>{number.format(ratioPercent(run.max_drawdown))}%</td>
                  </tr>
                )) : <tr><td colSpan={5}>No backtest summaries available for this portfolio.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Trade Ngin · live equity</span><small>bounded newest points</small></div>
          <div className="fabric-scroll">
            <table>
              <thead><tr><th>Time</th><th>Portfolio value</th></tr></thead>
              <tbody>
                {equity.length ? equity.map((point) => (
                  <tr key={point.date}>
                    <th scope="row">{shortDate(point.date)}</th><td>{money.format(point.value)}</td>
                  </tr>
                )) : <tr><td colSpan={2}>No bounded live equity history available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <TradeEvidencePanel operational={operational} />

      <div className="fabric-contracts">
        {[...(data?.datasets ?? []), ...(trade?.datasets ?? [])].map((dataset) => (
          <span className={`dataset-${dataset.status ?? 'catalog'}`} key={dataset.name}>
            <strong>{dataset.name}</strong>
            <i>{dataset.status ?? 'catalog'}</i>
            <small>{dataset.role}</small>
            <em>{dataset.mode ?? 'source contract'}{dataset.rowCount === undefined || dataset.rowCount === null ? '' : ` · ${dataset.rowCount} rows`}</em>
            {dataset.message ? <small>{dataset.message}</small> : null}
          </span>
        ))}
      </div>

      {trade?.nonPersisted.length ? (
        <div className="fabric-non-persisted">
          <strong>Not persisted by Trade Ngin</strong>
          {trade.nonPersisted.map((dataset) => <span key={dataset.name}>{dataset.name} · {dataset.role}</span>)}
        </div>
      ) : null}

      <div className="fabric-caveat">
        <strong>Honest boundary</strong>
        <ul>
          {(overview?.limitations ?? ['Live source state is shown above. Signal IC, factors, capacity, and admission gates below remain modeled and are not derived from these records yet.']).map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
