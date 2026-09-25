import { describe, expect, it } from 'vitest';

import {
  HORIZONS,
  evaluateScenario,
  getAlphaCurve,
  getEvidenceRows,
  getFactorExposures,
  getPortfolioView,
  type ScenarioInput,
} from './model';

const defaultScenario: ScenarioInput = {
  horizonDays: 5,
  capitalUsd: 250_000,
  delayDays: 1,
  costBps: 10,
  window: '5Y',
  neutralization: 'full-style',
};

describe('evaluateScenario', () => {
  it('is deterministic for the same inputs', () => {
    const first = evaluateScenario(defaultScenario);
    const second = evaluateScenario({ ...defaultScenario });

    expect(second).toEqual(first);
  });

  it('passes the default scenario through all three gates', () => {
    const result = evaluateScenario(defaultScenario);

    expect(result).toMatchObject({
      timingVerdict: 'PASS',
      factorVerdict: 'PASS',
      portfolioVerdict: 'PASS',
      overallVerdict: 'PASS',
    });
    expect(result.reasons).toEqual([]);
  });

  it('fails when costs and execution delay consume the edge', () => {
    const result = evaluateScenario({
      ...defaultScenario,
      delayDays: 2,
      costBps: 15,
      window: '1Y',
    });

    expect(result.netEdgeLower95Bps).toBeLessThan(0);
    expect(result.timingVerdict).toBe('FAIL');
    expect(result.overallVerdict).toBe('FAIL');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Costs and uncertainty consume the net edge',
        'Execution delay exceeds the signal half-life',
      ]),
    );
  });

  it('returns UNKNOWN for missing 1Y full-style coverage when the other gates pass', () => {
    const result = evaluateScenario({
      ...defaultScenario,
      capitalUsd: 100_000,
      delayDays: 0,
      costBps: 5,
      window: '1Y',
    });

    expect(result.timingVerdict).toBe('PASS');
    expect(result.factorVerdict).toBe('UNKNOWN');
    expect(result.portfolioVerdict).toBe('PASS');
    expect(result.overallVerdict).toBe('UNKNOWN');
    expect(result.reasons).toContain('Full-style factor history is incomplete for the 1Y window');
  });

  it('fails book fit when proposed capital exceeds capacity', () => {
    const result = evaluateScenario({
      ...defaultScenario,
      capitalUsd: 1_000_000,
    });

    expect(result.capacityUsd).toBe(800_000);
    expect(result.portfolioVerdict).toBe('FAIL');
    expect(result.overallVerdict).toBe('FAIL');
    expect(result.reasons).toContain('Proposed capital exceeds estimated capacity');
  });

  it('records an excessive execution delay in the predictive evidence ledger', () => {
    const input: ScenarioInput = {
      ...defaultScenario,
      delayDays: 2,
      costBps: 5,
    };
    const result = evaluateScenario(input);
    const delayEvidence = getEvidenceRows(input, result).find((row) => row.test === 'Execution delay');

    expect(result.netEdgeLower95Bps).toBeGreaterThan(0);
    expect(result.timingVerdict).toBe('FAIL');
    expect(delayEvidence).toMatchObject({ observed: '2D', threshold: '≤ 1D', verdict: 'FAIL' });
  });
});

describe('derived dashboard data', () => {
  it('keeps AlphaClock points reconciled to direct scenario evaluation', () => {
    const curveInput = {
      capitalUsd: defaultScenario.capitalUsd,
      delayDays: defaultScenario.delayDays,
      costBps: defaultScenario.costBps,
      window: defaultScenario.window,
      neutralization: defaultScenario.neutralization,
    };
    const curve = getAlphaCurve(curveInput);

    expect(curve).toHaveLength(HORIZONS.length);
    expect(curve.map((point) => point.horizonDays)).toEqual([...HORIZONS]);

    for (const point of curve) {
      const direct = evaluateScenario({ ...curveInput, horizonDays: point.horizonDays });
      expect(point).toMatchObject({
        ic: direct.ic,
        grossEdgeBps: direct.grossEdgeBps,
        netEdgeBps: direct.netEdgeBps,
        netEdgeLower95Bps: direct.netEdgeLower95Bps,
        verdict: direct.timingVerdict,
      });
      expect(point.icBand[0]).toBe(direct.icLower95);
      expect(point.icBand[0]).toBeLessThanOrEqual(point.ic);
      expect(point.icBand[1]).toBeGreaterThanOrEqual(point.ic);
    }
  });

  it('produces factor, portfolio, and evidence views that agree with the result', () => {
    const input: ScenarioInput = {
      ...defaultScenario,
      capitalUsd: 100_000,
      delayDays: 0,
      costBps: 5,
      window: '1Y',
    };
    const result = evaluateScenario(input);
    const factors = getFactorExposures(input);
    const portfolio = getPortfolioView(input, result);
    const evidence = getEvidenceRows(input, result);

    expect(factors).toHaveLength(7);
    expect(factors.filter((factor) => !factor.covered).map((factor) => factor.factor).sort()).toEqual([
      'Liquidity',
      'Volatility',
    ]);

    expect(portfolio.nodes).toHaveLength(7);
    expect(portfolio.nodes.find((node) => node.kind === 'candidate')).toMatchObject({
      name: 'Candidate',
      factorOverlap: result.maxResidualExposure,
    });
    expect(portfolio.proposedSharpe - portfolio.currentSharpe).toBeCloseTo(result.deltaSharpe);
    expect(portfolio.proposedExpectedShortfallPct).toBe(result.expectedShortfallPct);
    expect(portfolio.capacityUsedPct).toBeCloseTo((input.capitalUsd / result.capacityUsd) * 100);

    expect(evidence).toHaveLength(8);
    expect(evidence.filter((row) => row.gate === 'Independent').map((row) => row.verdict)).toEqual([
      'UNKNOWN',
      'UNKNOWN',
    ]);
    expect(evidence.filter((row) => row.gate === 'Predictive').every((row) => row.verdict === 'PASS')).toBe(
      true,
    );
    expect(evidence.filter((row) => row.gate === 'Book fit').every((row) => row.verdict === 'PASS')).toBe(true);
  });
});
