import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { PortfolioView } from '../model';
import { PanelHeading } from './PanelHeading';

interface BookAtlasPanelProps {
  portfolio: PortfolioView;
}

export function BookAtlasPanel({ portfolio }: BookAtlasPanelProps) {
  const chartData = portfolio.nodes.map((node) => ({ ...node, size: Math.max(40, node.weightPct * 9) }));

  return (
    <article className="panel analytic-panel book-panel">
      <PanelHeading
        eyebrow="04 · BookAtlas · modeled"
        title="Where it could fit in an illustrative book"
        aside={<><span className="panel-kicker">Proposed weight</span><strong>{portfolio.proposedWeightPct.toFixed(1)}%</strong></>}
      />
      <div className="chart-wrap book-chart" role="img" aria-label="Candidate and strategy sleeves mapped by factor and drawdown overlap">
        <ResponsiveContainer width="100%" height={255}>
          <ScatterChart margin={{ top: 24, right: 22, bottom: 12, left: -8 }}>
            <CartesianGrid stroke="rgba(255,255,255,.07)" />
            <XAxis
              type="number"
              dataKey="factorOverlap"
              name="Factor overlap"
              domain={[0, 0.8]}
              tick={{ fill: '#9c9ba6', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: 'rgba(255,255,255,.12)' }}
              tickLine={false}
              label={{ value: 'FACTOR OVERLAP →', position: 'insideBottomRight', offset: -8, fill: '#777783', fontSize: 8 }}
            />
            <YAxis
              type="number"
              dataKey="drawdownOverlap"
              name="Drawdown overlap"
              domain={[0.1, 0.8]}
              tick={{ fill: '#9c9ba6', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="size" range={[55, 265]} />
            <Tooltip
              cursor={{ strokeDasharray: '4 4' }}
              contentStyle={{ background: '#1b1c23', border: '1px solid rgba(255,255,255,.16)', borderRadius: 0, fontSize: 11 }}
            />
            <ReferenceLine x={0.35} stroke="rgba(16,185,129,.55)" strokeDasharray="4 4" />
            <ReferenceLine y={0.35} stroke="rgba(16,185,129,.55)" strokeDasharray="4 4" />
            <Scatter data={chartData} isAnimationActive={false}>
              {chartData.map((node) => (
                <Cell
                  key={node.name}
                  fill={node.kind === 'candidate' ? '#ff5c00' : '#818cf8'}
                  stroke={node.kind === 'candidate' ? '#ffd2b8' : '#b7bcff'}
                  strokeWidth={node.kind === 'candidate' ? 2 : 1}
                />
              ))}
              <LabelList dataKey="name" position="top" fill="#d7d5d0" fontSize={8} fontFamily="IBM Plex Mono" />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Exact strategy positions in the book risk map</caption>
        <thead><tr><th scope="col">Sleeve</th><th scope="col">Factor overlap</th><th scope="col">Drawdown overlap</th><th scope="col">Weight</th></tr></thead>
        <tbody>
          {portfolio.nodes.map((node) => (
            <tr key={node.name}>
              <th scope="row">{node.name}</th>
              <td>{node.factorOverlap.toFixed(2)}</td>
              <td>{node.drawdownOverlap.toFixed(2)}</td>
              <td>{node.weightPct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="book-note"><span>Preferred zone</span> Lower-left = less duplicated risk</div>
      <dl className="book-comparison">
        <div className="comparison-head"><dt>Metric</dt><dd>Illustrative baseline</dd><dd>Modeled proposal</dd></div>
        <div><dt>Portfolio Sharpe</dt><dd>{portfolio.currentSharpe.toFixed(2)}</dd><dd className={portfolio.proposedSharpe > portfolio.currentSharpe ? 'positive-text' : 'negative-text'}>{portfolio.proposedSharpe.toFixed(2)}</dd></div>
        <div><dt>Expected shortfall</dt><dd>{portfolio.currentExpectedShortfallPct.toFixed(2)}%</dd><dd>{portfolio.proposedExpectedShortfallPct.toFixed(2)}%</dd></div>
        <div><dt>Signal capacity used</dt><dd>—</dd><dd className={portfolio.capacityUsedPct <= 100 ? '' : 'negative-text'}>{portfolio.capacityUsedPct.toFixed(0)}%</dd></div>
      </dl>
    </article>
  );
}
