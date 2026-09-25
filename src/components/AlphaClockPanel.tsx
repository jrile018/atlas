import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AlphaCurvePoint } from '../model';
import { PanelHeading } from './PanelHeading';

interface AlphaClockPanelProps {
  curve: AlphaCurvePoint[];
  selectedHorizon: number;
}

const tooltipStyle = {
  background: '#1b1c23',
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: 0,
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 11,
};

export function AlphaClockPanel({ curve, selectedHorizon }: AlphaClockPanelProps) {
  const point = curve.find((item) => item.horizonDays === selectedHorizon) ?? curve[0];
  const icValues = curve.flatMap((item) => [item.icBand[0], item.icBand[1], item.ic]);
  const edgeValues = curve.flatMap((item) => [item.grossEdgeBps, item.netEdgeBps, item.netEdgeLower95Bps]);
  const icDomain: [number, number] = [
    Math.floor((Math.min(...icValues) - 0.005) * 100) / 100,
    Math.ceil((Math.max(...icValues) + 0.005) * 100) / 100,
  ];
  const edgeDomain: [number, number] = [
    Math.floor((Math.min(...edgeValues) - 2) / 5) * 5,
    Math.ceil((Math.max(...edgeValues) + 2) / 5) * 5,
  ];

  return (
    <article className="panel analytic-panel alpha-panel">
      <PanelHeading
        eyebrow="02 · AlphaClock · modeled"
        title="When the edge survives"
        aside={<><span className="panel-kicker">Selected</span><strong>{selectedHorizon}D</strong></>}
      />
      <div className="chart-wrap" role="img" aria-label="Information coefficient confidence band and gross versus net edge by holding period">
        <ResponsiveContainer width="100%" height={255}>
          <ComposedChart data={curve} margin={{ top: 14, right: 5, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis
              dataKey="horizonDays"
              tickFormatter={(value) => `${value}D`}
              tick={{ fill: '#9c9ba6', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: 'rgba(255,255,255,.12)' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="ic"
              domain={icDomain}
              tick={{ fill: '#9c9ba6', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="edge"
              orientation="right"
              domain={edgeDomain}
              tick={{ fill: '#9c9ba6', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              unit=" bps"
            />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `${label} trading days`} />
            <ReferenceLine yAxisId="ic" y={0} stroke="rgba(255,255,255,.25)" />
            <ReferenceLine yAxisId="ic" x={selectedHorizon} stroke="#ff5c00" strokeDasharray="4 4" />
            <Area
              yAxisId="ic"
              type="monotone"
              dataKey="icBand"
              name="Illustrative IC uncertainty band"
              stroke="none"
              fill="#818cf8"
              fillOpacity={0.16}
              isAnimationActive={false}
            />
            <Line
              yAxisId="ic"
              type="monotone"
              dataKey="ic"
              name="Residual IC"
              stroke="#818cf8"
              strokeWidth={2}
              dot={{ r: 3, fill: '#14141a', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="edge"
              type="monotone"
              dataKey="grossEdgeBps"
              name="Gross edge (bps)"
              stroke="#f6f4ef"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="edge"
              type="monotone"
              dataKey="netEdgeBps"
              name="Net edge (bps)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="line-key indigo" /> Residual IC</span>
        <span><i className="line-key paper dashed" /> Gross edge</span>
        <span><i className="line-key green" /> Net edge</span>
      </div>
      <dl className="analytic-readout">
        <div><dt>Illustrative IC floor</dt><dd>{point.icBand[0].toFixed(3)}</dd></div>
        <div><dt>Gross edge</dt><dd>{point.grossEdgeBps.toFixed(1)} bps</dd></div>
        <div><dt>Net edge</dt><dd>{point.netEdgeBps.toFixed(1)} bps</dd></div>
        <div><dt>Illustrative net floor</dt><dd>{point.netEdgeLower95Bps.toFixed(1)} bps</dd></div>
      </dl>
    </article>
  );
}
