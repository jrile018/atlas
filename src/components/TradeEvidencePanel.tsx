import type {
  BacktestSummary,
  TradeOperationalArtifacts,
} from '../operations';

interface TradeEvidencePanelProps {
  operational: TradeOperationalArtifacts | undefined;
}

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function label(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character: string) => character.toUpperCase());
}

function scalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? number.format(value) : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  return 'Structured value withheld';
}

function moneyScalar(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? money.format(value) : scalar(value);
}

function summaryRows(summary: BacktestSummary | null | undefined) {
  return summary ? Object.entries(summary) : [];
}

export function TradeEvidencePanel({ operational }: TradeEvidencePanelProps) {
  const metrics = operational?.liveMetrics ? Object.entries(operational.liveMetrics) : [];
  const allocations = Object.entries(operational?.liveRunMetadata?.strategy_allocations ?? {});
  const instruments = operational?.instrumentMetadata ?? [];
  const selectedBacktest = operational?.selectedBacktest;
  const backtestSummary = summaryRows(selectedBacktest?.summary);

  return (
    <details className="fabric-deep-dive" open>
      <summary>
        <span>Full bounded Trade Ngin evidence</span>
        <small>Allowlisted fields only · no credentials or raw configuration</small>
      </summary>

      <div className="fabric-detail-grid">
        <article>
          <div className="fabric-table-title"><span>Persisted live metrics</span><small>{metrics.length} fields</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Field</th><th>Value</th></tr></thead>
              <tbody>
                {metrics.length ? metrics.map(([field, value]) => (
                  <tr key={field}><th scope="row">{label(field)}</th><td>{scalar(value)}</td></tr>
                )) : <tr><td colSpan={2}>No persisted live metric row available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Live run allocation</span><small>{scalar(operational?.liveRunMetadata?.date)}</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Strategy</th><th>Allocation</th></tr></thead>
              <tbody>
                {allocations.length ? allocations.map(([strategy, allocation]) => (
                  <tr key={strategy}><th scope="row">{strategy}</th><td>{number.format(allocation)}</td></tr>
                )) : <tr><td colSpan={2}>No safe live run allocation metadata available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="fabric-detail-wide">
          <div className="fabric-table-title"><span>Position-scoped instruments</span><small>{instruments.length} matched</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Data symbol</th><th>IB symbol</th><th>Name</th><th>Exchange</th><th>Contract size</th><th>Min tick</th><th>Dataset</th></tr></thead>
              <tbody>
                {instruments.length ? instruments.map((instrument, index) => (
                  <tr key={`${instrument.databento_symbol}-${instrument.ib_symbol}-${index}`}>
                    <th scope="row">{scalar(instrument.databento_symbol)}</th>
                    <td>{scalar(instrument.ib_symbol)}</td>
                    <td>{scalar(instrument.name)}</td>
                    <td>{scalar(instrument.exchange)}</td>
                    <td>{scalar(instrument.contract_size)}</td>
                    <td>{scalar(instrument.minimum_price_fluctuation)}</td>
                    <td>{scalar(instrument.dataset)}</td>
                  </tr>
                )) : <tr><td colSpan={7}>No contract metadata matched the visible live positions.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Selected backtest summary</span><small>portfolio scope</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Field</th><th>Value</th></tr></thead>
              <tbody>
                {backtestSummary.length ? backtestSummary.map(([field, value]) => (
                  <tr key={field}><th scope="row">{label(field)}</th><td>{scalar(value)}</td></tr>
                )) : <tr><td colSpan={2}>No recent portfolio-level backtest is available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="fabric-table-title"><span>Backtest equity</span><small>bounded history</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Time</th><th>Equity</th></tr></thead>
              <tbody>
                {selectedBacktest?.equityCurve.length ? selectedBacktest.equityCurve.map((point, index) => (
                  <tr key={`${scalar(point.timestamp)}-${index}`}><th scope="row">{scalar(point.timestamp)}</th><td>{moneyScalar(point.equity)}</td></tr>
                )) : <tr><td colSpan={2}>No selected-backtest equity history available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="fabric-detail-wide">
          <div className="fabric-table-title"><span>Backtest position snapshot</span><small>latest daily snapshot</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Strategy</th><th>Symbol</th><th>Qty</th><th>Basis</th><th>Unrealized</th><th>Realized</th><th>As of</th></tr></thead>
              <tbody>
                {selectedBacktest?.positionSnapshot.length ? selectedBacktest.positionSnapshot.map((position, index) => (
                  <tr key={`${scalar(position.strategy_id)}-${scalar(position.symbol)}-${index}`}>
                    <td>{scalar(position.strategy_id)}</td><th scope="row">{scalar(position.symbol)}</th><td>{scalar(position.quantity)}</td><td>{scalar(position.average_price)}</td><td>{scalar(position.unrealized_pnl)}</td><td>{scalar(position.realized_pnl)}</td><td>{scalar(position.last_update)}</td>
                  </tr>
                )) : <tr><td colSpan={7}>No selected-backtest position snapshot available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="fabric-detail-wide">
          <div className="fabric-table-title"><span>Backtest modeled executions</span><small>not broker fills</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Time</th><th>Strategy</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Total cost</th></tr></thead>
              <tbody>
                {selectedBacktest?.modeledExecutions.length ? selectedBacktest.modeledExecutions.map((execution, index) => (
                  <tr key={`${scalar(execution.execution_id)}-${index}`}>
                    <td>{scalar(execution.timestamp)}</td><td>{scalar(execution.strategy_id)}</td><th scope="row">{scalar(execution.symbol)}</th><td>{scalar(execution.side)}</td><td>{scalar(execution.quantity)}</td><td>{scalar(execution.price)}</td><td>{scalar(execution.total_transaction_costs)}</td>
                  </tr>
                )) : <tr><td colSpan={7}>No selected-backtest modeled executions available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="fabric-detail-wide">
          <div className="fabric-table-title"><span>Backtest run metadata</span><small>safe summary</small></div>
          <div className="fabric-scroll detail-scroll">
            <table>
              <thead><tr><th>Strategy</th><th>Name</th><th>Allocation</th><th>Start</th><th>End</th><th>Config fields</th><th>Hyperparameters</th></tr></thead>
              <tbody>
                {selectedBacktest?.runMetadata.length ? selectedBacktest.runMetadata.map((run, index) => (
                  <tr key={`${scalar(run.strategy_id)}-${index}`}>
                    <th scope="row">{scalar(run.strategy_id)}</th><td>{scalar(run.name)}</td><td>{scalar(run.strategy_allocation)}</td><td>{scalar(run.start_date)}</td><td>{scalar(run.end_date)}</td><td>{scalar(run.portfolio_config_field_count)}</td><td>{scalar(run.hyperparameter_count)}</td>
                  </tr>
                )) : <tr><td colSpan={7}>No safe selected-backtest run metadata available.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </details>
  );
}
