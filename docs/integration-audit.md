# Atlas integration audit

Date: 2026-09-24

## Outcome

Atlas is a well-structured, responsive quantitative-operations dashboard
with deterministic model tests and clear interaction design. Its operational
panel now reads the real, persisted contracts exposed by Data Ngin and Trade
Ngin. Its candidate, information coefficient, factor exposures, capacity, and
admission relationships remain explicitly modeled inputs because neither engine
currently persists the evidence needed to calculate them defensibly.

The safe integration path is now:

```text
Atlas browser
  -> credentialed Research API /operations/overview
       -> Data Ngin GraphQL (server-side API key)
       -> Trade Ngin PostgreSQL read model
```

This keeps database credentials and `DATA_NGIN_API_KEY` out of React, preserves
Research API's JWT/role controls, bounds history, and supports partial failure.
No analysis JSON file is created; JSON is only the versioned HTTP transport that
lets React render the dashboard.

## Connected contract

The schema `1.1` overview endpoint returns a bounded, provenance-aware snapshot:

- Data Ngin: normalized symbol universe, global earliest/latest clean bar,
  per-symbol sample coverage and freshness, and a bounded OHLCV sample from
  `futures_data.ohlcv_1d`. The connector rejects unknown symbols and malformed,
  non-finite, out-of-window, or OHLC-inconsistent rows rather than substituting
  another instrument.
- Trade Ngin: every one of its 12 persisted operational datasets reports its
  read mode, status, row count, and as-of value. Bounded evidence includes live
  metrics/equity, per-strategy positions, coherent signal snapshots, modeled
  rebalance executions and costs, safe run metadata, visible-position contract
  metadata, recent backtest summaries, and selected-backtest detail.
- Non-persisted artifacts: broker orders, broker fills, live quotes, and full
  risk-decision snapshots are named and reported as unavailable, not inferred.
- Source status: `available`, `degraded`, or `unavailable`, plus as-of and
  freshness details.
- Actual lineage from each engine through Research API to Atlas, plus all
  known source limitations in the rendered dashboard.

The endpoint is internal-only (`admin` or `general_member`) and uses the same
httpOnly JWT cookie as the rest of Research API. Its Trade Ngin connection sets
PostgreSQL read-only mode and a bounded statement timeout; production should
also use a dedicated database role with `SELECT` only. Data Ngin's API key and
all database credentials remain server-side. Invalid or missing optional tables
degrade only that dataset/source instead of fabricating zero values, and Data
Ngin and Trade Ngin failures are isolated from one another.

## Integration-boundary safeguards added

- Query parameters, market samples, equity history, execution history, and
  backtest detail are bounded before or inside the SQL/API reads.
- Trade positions are kept per strategy, rather than collapsing duplicate
  symbols across strategies. The dashboard reads a coherent latest signal
  snapshot and labels executions as modeled deltas, never broker fills.
- Future-dated observations produce `unknown` freshness, and backtest ratios are
  converted to percentages only at the presentation boundary.
- Optional-table query failures roll back before subsequent reads, so one
  missing dataset does not poison the rest of the snapshot.
- Raw run configurations and hyperparameters are not sent to the browser.
- The frontend strictly validates schema `1.1`, distinguishes unauthorized from
  forbidden access, clears stale data after a failed refresh, and never replaces
  failed live sources with demo values.
- A static-site publish path was removed: this authenticated, server-backed
  local tool cannot function correctly as a standalone static page.

## Current local availability

The dashboard, Research API, and Data Ngin are running locally through an
explicit `seeded-demo` mode. The dashboard visibly labels every representative
row as seeded rather than live, while still exercising the real authenticated
Research API, GraphQL, validation, and browser boundaries. This checkout has no
PostgreSQL service or private Trade Ngin credentials, so the Trade read model is
also a deterministic, read-only adapter. Once a real Data Ngin service and
read-only database credentials are supplied, disabling the two demo flags lets
the same screen populate from the bounded live contract without a frontend
rebuild.

## Build-quality verdict

The implementation is fit for an internal, read-only operations dashboard and
for QR/QT exploration. It is not yet fit to serve as an automated production
trading or capital-admission gate because the upstream run-finality, instrument
identity, factor, capacity, and broker-fill contracts do not yet exist.

Verification completed on this checkout:

- Research API: 273 tests pass; Ruff and mypy pass across 81 source files.
- Atlas: 15 tests pass with 90.83% statement and 80.34% branch coverage;
  ESLint, TypeScript, and the production build pass.
- The gzipped JavaScript and CSS total is about 164 KiB, below the 500 KiB CI
  budget. The single main JavaScript chunk is 601.52 kB before gzip and should
  eventually be split for faster cold loads.
- The live local route was checked at desktop and 390 px mobile widths with no
  console errors or horizontal overflow. Automated browser end-to-end coverage
  is still a follow-up; the current CI e2e option remains disabled.
- CI path checks cover the dashboard and its Research API route, composition,
  Data Ngin connector, read-only database setup, and Trade Ngin repository.

## What is built well

- Data Ngin has a clear loader/fetcher/cleaner/repository pipeline and a narrow
  GraphQL read contract over cleaned OHLCV.
- Trade Ngin consistently consumes the seven-field OHLCV contract and persists
  portfolio state into named trading/backtest tables.
- Research API already has useful application/infrastructure boundaries,
  explicit production CORS, JWT cookies, role checks, and portfolio-scoped SQL.
- Atlas has accessible controls, keyboard navigation, responsive tables,
  explicit modeled-data labeling, and deterministic gate tests.

## Critical issues retained for follow-up

1. **Instrument identity can be wrong.** Data Ngin requests E-mini data and then
   stores some rows under Micro symbols (`ES -> MES`, etc.). Price/volume and
   capacity work is unsafe until raw symbol, canonical symbol, multiplier, and
   alias lineage are preserved in one shared contract.
2. **Futures roll adjustment is not trustworthy.** Provider instrument identity
   is overwritten before roll detection, so the cleaner usually cannot see a
   contract change.
3. **The configured ingestion range is stale.** The checked-in end date is
   `2025-03-22`; freshness must be derived from actual per-symbol maxima, not
   configuration or the shallow `/health` response.
4. **Database provisioning is incomplete.** The monorepo does not own migrations
   for the core market, trading, and backtest tables. Startup capability checks
   are required until those schemas are migration-owned.
5. **Trade Ngin executions are not broker fills.** They are modeled daily
   position deltas at a reference price. The dashboard calls them modeled
   rebalances and does not imply order acknowledgement or fill finality.
6. **Trade freshness is global, not per symbol.** One fresh instrument can mask
   absent or stale instruments. Admission evidence should become `UNKNOWN` when
   any required symbol is missing or stale.
7. **Multi-table result writes are non-atomic.** Live/backtest result managers can
   continue after component-save failures, so a latest row is not proof that
   signals, equity, positions, and executions form a complete run.
8. **An older Trade Ngin prior-position path can overwrite duplicate symbols
   across strategies.** The Atlas read adapter avoids that path and keeps
   strategy rows distinct, but the engine's own runtime aggregation still needs
   correction and regression coverage.
9. **Factor and capacity evidence does not exist.** There is no stored factor
   dataset/exposure model or defensible market-impact capacity study. FactorScope,
   capacity, marginal Sharpe, and admission gates remain modeled—not live.
10. **Repository versions drift.** The standalone Data/Trade repositories contain
    later work than the monorepo copies. The organization should choose an
    authoritative source before freezing shared API semantics.
11. **The combined view is observational, not an atomic run snapshot.** Reads
    across Data Ngin and Trade Ngin occur independently. A run identifier and
    completeness/finality contract are still required before it can support an
    automated release or trading gate.

## Next quantitative slice

The next safe step is a run-scoped research contract rather than more dashboard
heuristics:

1. Canonical instrument aliases and contract metadata, including multiplier and
   source symbol.
2. Per-symbol coverage, gaps, invalid OHLC/volume counts, and freshness.
3. Explicit backtest/live run identity with a completeness matrix and
   `provisional | final` state.
4. Stored signal observations aligned to forward returns, with sample counts and
   confidence intervals for AlphaClock.
5. A versioned factor-return/exposure dataset for FactorScope.
6. Observed cost/impact curves and participation assumptions for a real capacity
   study.

Until those prerequisites exist, missing evidence must remain `UNKNOWN`, never
`PASS`, `FAIL`, or numeric zero.
