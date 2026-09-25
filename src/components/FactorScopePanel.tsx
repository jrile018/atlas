import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FactorExposure, Neutralization } from '../model';
import { NEUTRALIZATION_LABELS } from '../model';
import { PanelHeading } from './PanelHeading';

interface FactorScopePanelProps {
  factors: FactorExposure[];
  neutralization: Neutralization;
  residualAlphaBps: number;
  residualAlphaLower95Bps: number;
}

export function FactorScopePanel({
  factors,
  neutralization,
  residualAlphaBps,
  residualAlphaLower95Bps,
}: FactorScopePanelProps) {
  const missingCount = factors.filter((factor) => !factor.covered).length;
  const coveredFactors = factors.filter((factor) => factor.covered);
  const maxContribution = Math.max(...coveredFactors.map((factor) => Math.abs(factor.contributionBps)), 0.1);
  const chartFactors = factors.map((factor) => ({
    ...factor,
    residual: factor.covered ? factor.residual : null,
  }));

  return (
    <article className="panel analytic-panel factor-panel">
      <PanelHeading
        eyebrow="03 · FactorScope · modeled"
        title="What the signal really contains"
        aside={<><span className="panel-kicker">Policy</span><strong>{NEUTRALIZATION_LABELS[neutralization]}</strong></>}
      />
      <div className="chart-wrap factor-chart" role="img" aria-label="Raw and residual factor exposure after neutralization">
        <ResponsiveContainer width="100%" height={255}>
          <BarChart data={chartFactors} layout="vertical" margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,.07)" horizontal={false} />
            <XAxis
              type="number"
              domain={[-0.7, 0.7]}
              tick={{ fill: '#9c9ba6', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: 'rgba(255,255,255,.12)' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="factor"
              width={72}
              tick={{ fill: '#d7d5d0', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#1b1c23', border: '1px solid rgba(255,255,255,.16)', borderRadius: 0, fontSize: 11 }}
            />
            <ReferenceLine x={0} stroke="rgba(255,255,255,.35)" />
            <Bar dataKey="raw" name="Raw exposure" fill="#565864" barSize={7} isAnimationActive={false} />
            <Bar dataKey="residual" name="Residual exposure" fill="#ff5c00" barSize={7} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Exact raw and residual factor exposures</caption>
        <thead><tr><th scope="col">Factor</th><th scope="col">Raw</th><th scope="col">Residual</th><th scope="col">Contribution</th></tr></thead>
        <tbody>
          {factors.map((factor) => (
            <tr key={factor.factor}>
              <th scope="row">{factor.factor}</th>
              <td>{factor.raw.toFixed(2)}</td>
              <td>{factor.covered ? factor.residual.toFixed(2) : 'Unknown'}</td>
              <td>{factor.covered ? `${factor.contributionBps.toFixed(1)} basis points` : 'Unknown'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="block-key slate" /> Raw</span>
        <span><i className="block-key orange" /> Residual</span>
        <span className={missingCount ? 'coverage-warning' : ''}>
          {missingCount ? `${missingCount} factors incomplete` : 'Coverage complete'}
        </span>
      </div>
      <div className="contribution-stack" aria-label="Residual return contribution by factor">
        {factors.map((factor) => (
          <div className={`contribution-row ${factor.covered ? '' : 'uncovered'}`} key={factor.factor}>
            <span>{factor.factor}</span>
            <div className="contribution-track">
              <i
                className={factor.contributionBps >= 0 ? 'positive' : 'negative'}
                style={{ width: factor.covered ? `${Math.max(5, Math.abs(factor.contributionBps) / maxContribution * 100)}%` : '0%' }}
              />
            </div>
            <strong>{factor.covered ? `${factor.contributionBps >= 0 ? '+' : ''}${factor.contributionBps.toFixed(1)}` : 'N/A'}</strong>
          </div>
        ))}
      </div>
      <dl className="analytic-readout two-up">
        <div><dt>Residual alpha</dt><dd>{residualAlphaBps.toFixed(1)} bps</dd></div>
        <div><dt>Illustrative uncertainty floor</dt><dd>{missingCount ? 'Incomplete' : `${residualAlphaLower95Bps.toFixed(1)} bps`}</dd></div>
      </dl>
    </article>
  );
}
