export type Verdict = 'PASS' | 'FAIL' | 'UNKNOWN';
export type AnalysisWindow = '1Y' | '3Y' | '5Y';
export type Neutralization = 'raw' | 'market' | 'market-sector' | 'full-style';

export interface ScenarioInput {
  horizonDays: number;
  capitalUsd: number;
  delayDays: number;
  costBps: number;
  window: AnalysisWindow;
  neutralization: Neutralization;
}

export interface ScenarioResult {
  timingVerdict: Verdict;
  factorVerdict: Verdict;
  portfolioVerdict: Verdict;
  overallVerdict: Verdict;
  ic: number;
  icLower95: number;
  grossEdgeBps: number;
  netEdgeBps: number;
  netEdgeLower95Bps: number;
  residualAlphaBps: number;
  residualAlphaLower95Bps: number;
  maxResidualExposure: number;
  deltaSharpe: number;
  expectedShortfallPct: number;
  capacityUsd: number;
  turnoverPct: number;
  reasons: string[];
}

export interface AlphaCurvePoint {
  horizonDays: number;
  ic: number;
  icBand: [number, number];
  grossEdgeBps: number;
  netEdgeBps: number;
  netEdgeLower95Bps: number;
  verdict: Verdict;
}

export interface FactorExposure {
  factor: string;
  raw: number;
  residual: number;
  contributionBps: number;
  covered: boolean;
}

export interface PortfolioNode {
  name: string;
  factorOverlap: number;
  drawdownOverlap: number;
  weightPct: number;
  kind: 'book' | 'candidate';
}

export interface PortfolioView {
  nodes: PortfolioNode[];
  currentSharpe: number;
  proposedSharpe: number;
  currentExpectedShortfallPct: number;
  proposedExpectedShortfallPct: number;
  capacityUsedPct: number;
  proposedWeightPct: number;
}

export interface EvidenceRow {
  gate: 'Predictive' | 'Independent' | 'Book fit';
  test: string;
  observed: string;
  threshold: string;
  verdict: Verdict;
}

export const HORIZONS = [1, 5, 10, 20] as const;
export const CAPITAL_LEVELS = [100_000, 250_000, 500_000, 1_000_000] as const;
export const DELAY_OPTIONS = [0, 1, 2] as const;
export const COST_OPTIONS = [5, 10, 15] as const;

export const NEUTRALIZATION_LABELS: Record<Neutralization, string> = {
  raw: 'Raw',
  market: 'Market',
  'market-sector': 'Market + sector',
  'full-style': 'Full style',
};

const HORIZON_PROFILE: Record<
  number,
  { ic: number; icLower: number; grossEdge: number; turnover: number; maxDelay: number; capacity: number }
> = {
  1: { ic: 0.028, icLower: -0.004, grossEdge: 10.4, turnover: 118, maxDelay: 0, capacity: 250_000 },
  5: { ic: 0.067, icLower: 0.039, grossEdge: 27.6, turnover: 72, maxDelay: 1, capacity: 800_000 },
  10: { ic: 0.061, icLower: 0.034, grossEdge: 24.2, turnover: 48, maxDelay: 2, capacity: 700_000 },
  20: { ic: 0.039, icLower: 0.011, grossEdge: 13.1, turnover: 31, maxDelay: 2, capacity: 450_000 },
};

const POLICY_PROFILE: Record<Neutralization, { edgeMultiplier: number; residualExposure: number }> = {
  raw: { edgeMultiplier: 1, residualExposure: 0.72 },
  market: { edgeMultiplier: 0.9, residualExposure: 0.47 },
  'market-sector': { edgeMultiplier: 0.8, residualExposure: 0.31 },
  'full-style': { edgeMultiplier: 0.7, residualExposure: 0.19 },
};

const WINDOW_MULTIPLIER: Record<AnalysisWindow, number> = {
  '1Y': 0.82,
  '3Y': 0.94,
  '5Y': 1,
};

const FACTOR_PROFILES = [
  { factor: 'Market', raw: 0.42, styleRetention: 0.08 },
  { factor: 'Sector', raw: 0.37, styleRetention: 0.12 },
  { factor: 'Momentum', raw: 0.58, styleRetention: 0.23 },
  { factor: 'Value', raw: -0.22, styleRetention: 0.3 },
  { factor: 'Size', raw: 0.19, styleRetention: 0.27 },
  { factor: 'Volatility', raw: -0.31, styleRetention: 0.21 },
  { factor: 'Liquidity', raw: 0.28, styleRetention: 0.25 },
] as const;

const POLICY_RETENTION: Record<Neutralization, (factor: string, styleRetention: number) => number> = {
  raw: () => 1,
  market: (factor) => (factor === 'Market' ? 0.08 : 0.82),
  'market-sector': (factor) => (factor === 'Market' || factor === 'Sector' ? 0.1 : 0.58),
  'full-style': (_factor, styleRetention) => styleRetention,
};

const combineVerdicts = (verdicts: Verdict[]): Verdict => {
  if (verdicts.includes('FAIL')) return 'FAIL';
  if (verdicts.includes('UNKNOWN')) return 'UNKNOWN';
  return 'PASS';
};

const passFail = (condition: boolean): Verdict => (condition ? 'PASS' : 'FAIL');

export function evaluateScenario(input: ScenarioInput): ScenarioResult {
  const horizon = HORIZON_PROFILE[input.horizonDays];
  const policy = POLICY_PROFILE[input.neutralization];
  const windowMultiplier = WINDOW_MULTIPLIER[input.window];

  if (!horizon) {
    throw new Error(`Unsupported horizon: ${input.horizonDays}`);
  }

  const ic = horizon.ic * policy.edgeMultiplier * windowMultiplier;
  const icLower95 = horizon.icLower * policy.edgeMultiplier - (input.window === '1Y' ? 0.007 : 0);
  const grossEdgeBps = horizon.grossEdge * policy.edgeMultiplier * windowMultiplier;
  const delayPenaltyBps = input.delayDays * (grossEdgeBps * 0.12);
  const costEffectBps = input.costBps * (horizon.turnover / 100);
  const netEdgeBps = grossEdgeBps - delayPenaltyBps - costEffectBps;
  const netEdgeLower95Bps = netEdgeBps - (input.window === '1Y' ? 7.5 : input.window === '3Y' ? 5 : 3.8);

  const residualAlphaBps = grossEdgeBps - 4.2 * policy.residualExposure;
  const residualAlphaLower95Bps = residualAlphaBps - (input.window === '1Y' ? 8.5 : 5.5);
  const factorCoverageMissing = input.window === '1Y' && input.neutralization === 'full-style';

  const capitalPressure = input.capitalUsd / horizon.capacity;
  const deltaSharpe = netEdgeLower95Bps / 100 - Math.max(0, capitalPressure - 0.55) * 0.1;
  const expectedShortfallPct = 6.15 + capitalPressure * 0.72 + policy.residualExposure * 0.18;

  const timingVerdict: Verdict =
    icLower95 > 0 && netEdgeLower95Bps > 0 && input.delayDays <= horizon.maxDelay ? 'PASS' : 'FAIL';
  const factorVerdict: Verdict = factorCoverageMissing
    ? 'UNKNOWN'
    : residualAlphaLower95Bps > 0 && policy.residualExposure <= 0.35
      ? 'PASS'
      : 'FAIL';
  const portfolioVerdict: Verdict =
    input.capitalUsd <= horizon.capacity && deltaSharpe > 0.025 && expectedShortfallPct <= 7.35
      ? 'PASS'
      : 'FAIL';

  const reasons: string[] = [];
  if (icLower95 <= 0) reasons.push('IC confidence interval crosses zero');
  if (netEdgeLower95Bps <= 0) reasons.push('Costs and uncertainty consume the net edge');
  if (input.delayDays > horizon.maxDelay) reasons.push('Execution delay exceeds the signal half-life');
  if (factorCoverageMissing) reasons.push('Full-style factor history is incomplete for the 1Y window');
  if (!factorCoverageMissing && policy.residualExposure > 0.35) reasons.push('Residual factor exposure exceeds 0.35');
  if (!factorCoverageMissing && residualAlphaLower95Bps <= 0) reasons.push('Residual alpha is not distinguishable from zero');
  if (input.capitalUsd > horizon.capacity) reasons.push('Proposed capital exceeds estimated capacity');
  if (deltaSharpe <= 0.025) reasons.push('Marginal Sharpe improvement is too small');
  if (expectedShortfallPct > 7.35) reasons.push('Expected shortfall exceeds the book limit');

  return {
    timingVerdict,
    factorVerdict,
    portfolioVerdict,
    overallVerdict: combineVerdicts([timingVerdict, factorVerdict, portfolioVerdict]),
    ic,
    icLower95,
    grossEdgeBps,
    netEdgeBps,
    netEdgeLower95Bps,
    residualAlphaBps,
    residualAlphaLower95Bps,
    maxResidualExposure: policy.residualExposure,
    deltaSharpe,
    expectedShortfallPct,
    capacityUsd: horizon.capacity,
    turnoverPct: horizon.turnover,
    reasons,
  };
}

export function getAlphaCurve(input: Omit<ScenarioInput, 'horizonDays'>): AlphaCurvePoint[] {
  return HORIZONS.map((horizonDays) => {
    const result = evaluateScenario({ ...input, horizonDays });
    const uncertainty = result.ic - result.icLower95;
    return {
      horizonDays,
      ic: result.ic,
      icBand: [result.icLower95, result.ic + uncertainty],
      grossEdgeBps: result.grossEdgeBps,
      netEdgeBps: result.netEdgeBps,
      netEdgeLower95Bps: result.netEdgeLower95Bps,
      verdict: result.timingVerdict,
    };
  });
}

export function getFactorExposures(input: ScenarioInput): FactorExposure[] {
  const horizonScale = 1 + (input.horizonDays - 10) / 160;
  const capitalScale = 1 + Math.min(input.capitalUsd / 2_000_000, 0.5);
  const coverageMissing = input.window === '1Y' && input.neutralization === 'full-style';

  return FACTOR_PROFILES.map(({ factor, raw, styleRetention }) => {
    const retention = POLICY_RETENTION[input.neutralization](factor, styleRetention);
    const residual = raw * retention * horizonScale;
    return {
      factor,
      raw,
      residual,
      contributionBps: residual * 5.6 * capitalScale,
      covered: !(coverageMissing && (factor === 'Liquidity' || factor === 'Volatility')),
    };
  });
}

export function getPortfolioView(input: ScenarioInput, result: ScenarioResult): PortfolioView {
  const proposedWeightPct = Math.max(0.8, (input.capitalUsd / 12_500_000) * 100);
  const candidateDrawdownOverlap = Math.min(0.78, 0.16 + result.expectedShortfallPct / 22 + input.horizonDays / 180);
  const nodes: PortfolioNode[] = [
    { name: 'Trend', factorOverlap: 0.61, drawdownOverlap: 0.43, weightPct: 18, kind: 'book' },
    { name: 'Mean rev.', factorOverlap: 0.12, drawdownOverlap: 0.24, weightPct: 14, kind: 'book' },
    { name: 'Carry', factorOverlap: 0.27, drawdownOverlap: 0.34, weightPct: 15, kind: 'book' },
    { name: 'Value', factorOverlap: 0.46, drawdownOverlap: 0.39, weightPct: 17, kind: 'book' },
    { name: 'Vol arb', factorOverlap: 0.08, drawdownOverlap: 0.69, weightPct: 11, kind: 'book' },
    { name: 'Defensive', factorOverlap: 0.2, drawdownOverlap: 0.17, weightPct: 13, kind: 'book' },
    {
      name: 'Candidate',
      factorOverlap: result.maxResidualExposure,
      drawdownOverlap: candidateDrawdownOverlap,
      weightPct: proposedWeightPct,
      kind: 'candidate',
    },
  ];

  return {
    nodes,
    currentSharpe: 0.94,
    proposedSharpe: 0.94 + result.deltaSharpe,
    currentExpectedShortfallPct: 6.52,
    proposedExpectedShortfallPct: result.expectedShortfallPct,
    capacityUsedPct: (input.capitalUsd / result.capacityUsd) * 100,
    proposedWeightPct,
  };
}

export function getEvidenceRows(input: ScenarioInput, result: ScenarioResult): EvidenceRow[] {
  const missingFactorCoverage = input.window === '1Y' && input.neutralization === 'full-style';
  const maxDelayDays = HORIZON_PROFILE[input.horizonDays].maxDelay;
  return [
    {
      gate: 'Predictive',
      test: 'Illustrative IC floor',
      observed: result.icLower95.toFixed(3),
      threshold: '> 0.000',
      verdict: passFail(result.icLower95 > 0),
    },
    {
      gate: 'Predictive',
      test: 'Illustrative net edge floor',
      observed: `${result.netEdgeLower95Bps.toFixed(1)} bps`,
      threshold: '> 0.0 bps',
      verdict: passFail(result.netEdgeLower95Bps > 0),
    },
    {
      gate: 'Predictive',
      test: 'Execution delay',
      observed: `${input.delayDays}D`,
      threshold: `≤ ${maxDelayDays}D`,
      verdict: passFail(input.delayDays <= maxDelayDays),
    },
    {
      gate: 'Independent',
      test: 'Illustrative residual-alpha floor',
      observed: missingFactorCoverage ? 'Incomplete' : `${result.residualAlphaLower95Bps.toFixed(1)} bps`,
      threshold: '> 0.0 bps',
      verdict: missingFactorCoverage ? 'UNKNOWN' : passFail(result.residualAlphaLower95Bps > 0),
    },
    {
      gate: 'Independent',
      test: 'Maximum residual exposure',
      observed: result.maxResidualExposure.toFixed(2),
      threshold: '≤ 0.35',
      verdict: missingFactorCoverage ? 'UNKNOWN' : passFail(result.maxResidualExposure <= 0.35),
    },
    {
      gate: 'Book fit',
      test: 'Marginal Sharpe change',
      observed: `${result.deltaSharpe >= 0 ? '+' : ''}${result.deltaSharpe.toFixed(2)}`,
      threshold: '> +0.03',
      verdict: passFail(result.deltaSharpe > 0.025),
    },
    {
      gate: 'Book fit',
      test: 'Capital vs capacity',
      observed: `${moneyCompact(input.capitalUsd)} / ${moneyCompact(result.capacityUsd)}`,
      threshold: '≤ 100%',
      verdict: passFail(input.capitalUsd <= result.capacityUsd),
    },
    {
      gate: 'Book fit',
      test: 'Expected shortfall',
      observed: `${result.expectedShortfallPct.toFixed(2)}%`,
      threshold: '≤ 7.35%',
      verdict: passFail(result.expectedShortfallPct <= 7.35),
    },
  ];
}

export const moneyCompact = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: value < 1_000_000 ? 0 : 1,
  }).format(value);
