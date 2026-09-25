import { useMemo, useState, type KeyboardEvent } from 'react';
import { Clock3, Layers3, Orbit, RotateCcw } from 'lucide-react';
import { AlphaClockPanel } from './components/AlphaClockPanel';
import { BookAtlasPanel } from './components/BookAtlasPanel';
import { DataFabricPanel } from './components/DataFabricPanel';
import { EvidenceTable } from './components/EvidenceTable';
import { FactorScopePanel } from './components/FactorScopePanel';
import { PanelHeading } from './components/PanelHeading';
import { VerdictBadge } from './components/VerdictBadge';
import {
  CAPITAL_LEVELS,
  COST_OPTIONS,
  DELAY_OPTIONS,
  HORIZONS,
  NEUTRALIZATION_LABELS,
  evaluateScenario,
  getAlphaCurve,
  getEvidenceRows,
  getFactorExposures,
  getPortfolioView,
  moneyCompact,
  type AnalysisWindow,
  type Neutralization,
  type ScenarioInput,
} from './model';
import { useOperationsOverview } from './useOperationsOverview';

const DEFAULT_SCENARIO: ScenarioInput = {
  horizonDays: 10,
  capitalUsd: 250_000,
  neutralization: 'full-style',
  window: '5Y',
  delayDays: 1,
  costBps: 10,
};

export default function App() {
  const operations = useOperationsOverview();
  const [horizonDays, setHorizonDays] = useState(DEFAULT_SCENARIO.horizonDays);
  const [capitalUsd, setCapitalUsd] = useState(DEFAULT_SCENARIO.capitalUsd);
  const [neutralization, setNeutralization] = useState<Neutralization>(DEFAULT_SCENARIO.neutralization);
  const [window, setWindow] = useState<AnalysisWindow>(DEFAULT_SCENARIO.window);
  const [delayDays, setDelayDays] = useState(DEFAULT_SCENARIO.delayDays);
  const [costBps, setCostBps] = useState(DEFAULT_SCENARIO.costBps);

  const input = useMemo<ScenarioInput>(
    () => ({ horizonDays, capitalUsd, neutralization, window, delayDays, costBps }),
    [capitalUsd, costBps, delayDays, horizonDays, neutralization, window],
  );
  const selected = useMemo(() => evaluateScenario(input), [input]);
  const alphaCurve = useMemo(
    () => getAlphaCurve({ capitalUsd, neutralization, window, delayDays, costBps }),
    [capitalUsd, costBps, delayDays, neutralization, window],
  );
  const factors = useMemo(() => getFactorExposures(input), [input]);
  const portfolio = useMemo(() => getPortfolioView(input, selected), [input, selected]);
  const evidence = useMemo(() => getEvidenceRows(input, selected), [input, selected]);

  const gates = [
    { name: 'Predictive', detail: 'Timing + cost', verdict: selected.timingVerdict, icon: Clock3 },
    { name: 'Independent', detail: 'Factor residual', verdict: selected.factorVerdict, icon: Layers3 },
    { name: 'Book fit', detail: 'Marginal utility', verdict: selected.portfolioVerdict, icon: Orbit },
  ];

  const resetScenario = () => {
    setHorizonDays(DEFAULT_SCENARIO.horizonDays);
    setCapitalUsd(DEFAULT_SCENARIO.capitalUsd);
    setNeutralization(DEFAULT_SCENARIO.neutralization);
    setWindow(DEFAULT_SCENARIO.window);
    setDelayDays(DEFAULT_SCENARIO.delayDays);
    setCostBps(DEFAULT_SCENARIO.costBps);
  };

  const moveSurfaceFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    horizonIndex: number,
    capitalIndex: number,
  ) => {
    const movements: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const movement = movements[event.key];
    if (!movement) return;
    event.preventDefault();
    const nextHorizonIndex = Math.min(HORIZONS.length - 1, Math.max(0, horizonIndex + movement[0]));
    const nextCapitalIndex = Math.min(CAPITAL_LEVELS.length - 1, Math.max(0, capitalIndex + movement[1]));
    const nextHorizon = HORIZONS[nextHorizonIndex];
    const nextCapital = CAPITAL_LEVELS[nextCapitalIndex];
    setHorizonDays(nextHorizon);
    setCapitalUsd(nextCapital);
    requestAnimationFrame(() => document.getElementById(`surface-${nextHorizon}-${nextCapital}`)?.focus());
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="eyebrow">AlgoGators · Quant research</p>
            <h1>Atlas</h1>
          </div>
        </div>
        <div className="header-meta">
          <span className={`demo-badge source-${operations.overview?.status ?? 'offline'}`}>
            {operations.overview
              ? `${operations.overview.status} sources${operations.overview.runtimeMode === 'seeded-demo' ? ' · seeded demo' : ''}`
              : 'Sources offline'}
          </span>
          <span className="asof">Model lab · illustrative</span>
        </div>
      </header>

      <main>
        <DataFabricPanel
          overview={operations.overview}
          loading={operations.loading}
          refreshing={operations.refreshing}
          connecting={operations.connecting}
          authRequired={operations.authRequired}
          error={operations.error}
          onRefresh={operations.refresh}
          onConnect={operations.connectLocal}
        />

        <section className="control-deck" aria-label="Analysis controls">
          <div className="candidate-copy">
            <p className="eyebrow">Modeled candidate 01 · not sourced from live services</p>
            <h2>Cross-sectional momentum · v4</h2>
            <p>US liquid equities · illustrative sample · SPY benchmark</p>
          </div>

          <label>
            Window
            <select value={window} onChange={(event) => setWindow(event.target.value as AnalysisWindow)}>
              <option value="1Y">1 year</option>
              <option value="3Y">3 years</option>
              <option value="5Y">5 years</option>
            </select>
          </label>

          <fieldset className="compact-control">
            <legend>Execution delay</legend>
            <div>
              {DELAY_OPTIONS.map((delay) => (
                <button
                  type="button"
                  key={delay}
                  className={delayDays === delay ? 'active' : ''}
                  aria-pressed={delayDays === delay}
                  onClick={() => setDelayDays(delay)}
                >
                  {delay}D
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="compact-control">
            <legend>Trading cost</legend>
            <div>
              {COST_OPTIONS.map((cost) => (
                <button
                  type="button"
                  key={cost}
                  className={costBps === cost ? 'active' : ''}
                  aria-pressed={costBps === cost}
                  onClick={() => setCostBps(cost)}
                >
                  {cost}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="button" className="reset-button" onClick={resetScenario}>
            <RotateCcw aria-hidden="true" size={14} /> Reset
          </button>

          <fieldset className="segmented-control">
            <legend>Neutralization</legend>
            <div>
              {(Object.keys(NEUTRALIZATION_LABELS) as Neutralization[]).map((policy) => (
                <button
                  type="button"
                  key={policy}
                  className={neutralization === policy ? 'active' : ''}
                  aria-pressed={neutralization === policy}
                  onClick={() => setNeutralization(policy)}
                >
                  {NEUTRALIZATION_LABELS[policy]}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <p className="sr-only" aria-live="polite">
          {selected.overallVerdict}. {horizonDays} day horizon, {moneyCompact(capitalUsd)} capital,
          {window} window, {NEUTRALIZATION_LABELS[neutralization]} neutralization, {costBps} basis points cost,
          {delayDays} day delay, {selected.netEdgeBps.toFixed(1)} basis points net edge, and
          {selected.deltaSharpe >= 0 ? ' plus ' : ' minus '}{Math.abs(selected.deltaSharpe).toFixed(2)} marginal Sharpe.
        </p>

        <section className="verdict-strip" aria-label="Selected scenario summary">
          <div className={`overall-verdict ${selected.overallVerdict.toLowerCase()}`}>
            <span>Modeled admission</span>
            <strong>{selected.overallVerdict}</strong>
          </div>
          <div className="metric">
            <span>Residual IC</span>
            <strong>{selected.ic.toFixed(3)}</strong>
            <small>Illustrative floor {selected.icLower95.toFixed(3)}</small>
          </div>
          <div className="metric">
            <span>Net edge</span>
            <strong>{selected.netEdgeBps.toFixed(1)} bps</strong>
            <small>after cost + delay</small>
          </div>
          <div className="metric">
            <span>Book impact</span>
            <strong>{selected.deltaSharpe >= 0 ? '+' : ''}{selected.deltaSharpe.toFixed(2)} SR</strong>
            <small>marginal Sharpe</small>
          </div>
          <div className="metric">
            <span>Scenario</span>
            <strong>{horizonDays}D · {moneyCompact(capitalUsd)}</strong>
            <small>{costBps} bps · {delayDays}D delay</small>
          </div>
        </section>

        <section className="decision-grid">
          <article className="panel admission-panel">
            <PanelHeading
              eyebrow="01 · Master decision surface"
                title="Where the modeled signal earns admission"
              aside={<span>Holding period × proposed capital</span>}
            />

            <div className="surface-scroll">
              <table className="admission-surface">
                <thead>
                  <tr>
                    <th scope="col">Horizon</th>
                    {CAPITAL_LEVELS.map((capital) => (
                      <th scope="col" key={capital}>{moneyCompact(capital)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORIZONS.map((horizon, horizonIndex) => (
                    <tr key={horizon}>
                      <th scope="row">{horizon}D</th>
                      {CAPITAL_LEVELS.map((capital, capitalIndex) => {
                        const scenario = evaluateScenario({
                          horizonDays: horizon,
                          capitalUsd: capital,
                          neutralization,
                          window,
                          delayDays,
                          costBps,
                        });
                        const isSelected = horizon === horizonDays && capital === capitalUsd;
                        return (
                          <td key={capital}>
                            <button
                              id={`surface-${horizon}-${capital}`}
                              type="button"
                              className={`surface-cell ${scenario.overallVerdict.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                              aria-pressed={isSelected}
                              aria-label={`${horizon}-day horizon, ${moneyCompact(capital)} capital, ${scenario.overallVerdict}, Sharpe change ${scenario.deltaSharpe.toFixed(2)}`}
                              onClick={() => {
                                setHorizonDays(horizon);
                                setCapitalUsd(capital);
                              }}
                              onKeyDown={(event) => moveSurfaceFocus(event, horizonIndex, capitalIndex)}
                            >
                              <span>{scenario.overallVerdict}</span>
                              <strong>{scenario.deltaSharpe >= 0 ? '+' : ''}{scenario.deltaSharpe.toFixed(2)}</strong>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="surface-legend" aria-label="Verdict legend">
              <span><i className="legend-swatch pass" /> Pass</span>
              <span><i className="legend-swatch fail" /> Fail</span>
              <span><i className="legend-swatch unknown" /> Unknown</span>
              <span className="legend-note">Cell value = marginal Sharpe change</span>
            </div>
          </article>

          <aside className="panel gate-panel" aria-label="Admission gates">
            <PanelHeading
              eyebrow="Three required gates"
              title={`Why this scenario ${selected.overallVerdict === 'PASS' ? 'passes' : 'stops'}`}
            />
            <div className="gate-list">
              {gates.map((gate, index) => {
                const Icon = gate.icon;
                return (
                  <div className="gate-row" key={gate.name}>
                    <span className="gate-number">0{index + 1}</span>
                    <Icon aria-hidden="true" size={19} />
                    <div>
                      <strong>{gate.name}</strong>
                      <span>{gate.detail}</span>
                    </div>
                    <VerdictBadge verdict={gate.verdict} />
                  </div>
                );
              })}
            </div>
            <div className="gate-explanation">
              <p className="eyebrow">Selected reading</p>
              <strong>{horizonDays} trading days at {moneyCompact(capitalUsd)}</strong>
              <p>
                {selected.reasons.length
                  ? selected.reasons[0]
                  : 'The edge survives costs and factor removal while improving the current book.'}
              </p>
            </div>
          </aside>
        </section>

        <section className="analytics-grid" aria-label="Linked quantitative analysis">
          <AlphaClockPanel curve={alphaCurve} selectedHorizon={horizonDays} />
          <FactorScopePanel
            factors={factors}
            neutralization={neutralization}
            residualAlphaBps={selected.residualAlphaBps}
            residualAlphaLower95Bps={selected.residualAlphaLower95Bps}
          />
          <BookAtlasPanel portfolio={portfolio} />
        </section>

        <EvidenceTable rows={evidence} />

        <footer className="dashboard-footer">
          <p><strong>Modeled research:</strong> deterministic illustrative calculations—not investment advice or live execution data.</p>
          <p>One candidate · three gates · one visible decision trail · no JSON export</p>
        </footer>
      </main>
      <div className="grid-atmosphere" aria-hidden="true" />
    </div>
  );
}
