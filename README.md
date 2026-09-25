# Atlas

Atlas is a local-only quantitative research dashboard for deciding whether
a candidate signal is ready to enter a portfolio. It keeps the decision inputs,
diagnostics, and admission verdict on one screen; it does not export a JSON
artifact or send orders.

The top **Live system context** panel is connected through the authenticated
Research API schema `1.1`. It shows bounded Data Ngin OHLCV and per-symbol
coverage plus the full bounded Trade Ngin read model: dataset status, portfolio
metrics/equity, per-strategy positions, persisted signals, modeled rebalance
records and costs, safe run metadata, instrument metadata, and selected
backtest evidence. The browser never receives database credentials, raw run
configurations, or the Data Ngin API key.

## How the dashboard fits together

- **AlphaClock** asks *when the signal works*. It compares information
  coefficient and expected gross/net edge across holding horizons, delay, cost,
  and capital assumptions.
- **FactorScope** asks *whether the edge is truly distinct*. It shows factor
  contribution and the exposure left after the selected neutralization policy.
- **BookAtlas** asks *whether the signal improves the existing book*. It places
  the candidate beside current strategies and compares current versus proposed
  portfolio metrics.

The views share the same controls and selected scenario. A useful handoff needs
all three answers: the signal must survive implementation, retain residual
alpha after factor removal, and add marginal portfolio value. The admission
matrix and gate rail summarize those checks without hiding the evidence panels.

## Run locally

Install and start the standalone dashboard:

```bash
pnpm install
pnpm dev
```

Open <http://127.0.0.1:3001>. The server binds only to the local machine.

Atlas deliberately contains no database credentials and never talks directly to
PostgreSQL. For connected data, run the AlgoGators Research API on
`127.0.0.1:5000` with its own database credentials and point that service at
Data Ngin (normally `127.0.0.1:8000/graphql`). The Vite server proxies
`/research-api` to the Research API. In local development,
`FLASK_ENV=development DEV_MODE=1` enables the dashboard's **Connect local dev**
button; never enable that bypass in production.

Research API settings:

```text
DATA_NGIN_GRAPHQL_URL=http://127.0.0.1:8000/graphql
DATA_NGIN_API_KEY=optional-server-side-key
DATA_NGIN_TIMEOUT_SECONDS=2.5
OPERATIONS_DB_STATEMENT_TIMEOUT_MS=5000
```

The operations connection asks PostgreSQL for read-only transactions and uses a
bounded statement timeout. In a real environment, supply a dedicated database
user that is independently restricted to `SELECT` on the allowlisted schemas.
If either upstream is missing, the dashboard leaves its data unavailable and
keeps the other source usable; it never turns missing evidence into zero.

### Upstream services

The connected operational panel depends on the integration implemented in the
AlgoGators monorepo:

- **Data Ngin** supplies bounded OHLCV observations and coverage.
- **Trade Ngin** persists portfolio metrics, equity, positions, signals, and
  safe operational metadata.
- **Research API** authenticates the browser, reads Trade Ngin through a
  read-only database role, calls Data Ngin server-side, and returns Atlas's
  versioned operations-overview contract.

Those services stay in their source repositories; this repository contains the
Atlas user interface and its contract parser. No database, credential, or
private runtime configuration is copied here.

### Run the complete seeded local demonstration

When Docker/PostgreSQL and private credentials are unavailable, the same real
GraphQL, authenticated Research API, and browser boundaries can be exercised
with deterministic representative rows. Each source and the header are visibly
labeled `seeded demo`; this mode must never be presented as live market or
portfolio data.

From the AlgoGators monorepo root, run the upstream services in separate
terminals, then run `pnpm dev` in this Atlas repository:

```bash
DATA_NGIN_DEMO_MODE=1 DATA_NGIN_API_KEY=local-demo-key \
.venv/bin/python -m uvicorn data_ngin.api.server:app \
  --host 127.0.0.1 --port 8000
```

```bash
FLASK_ENV=development DEV_MODE=1 OPERATIONS_DEMO_MODE=1 \
JWT_SECRET_KEY=atlas-local-dev-session \
DATA_NGIN_GRAPHQL_URL=http://127.0.0.1:8000/graphql \
DATA_NGIN_API_KEY=local-demo-key \
.venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 1 --threads 4 \
  research_api.wsgi:app
```

Open <http://127.0.0.1:3001/> and choose **Connect local dev** if the browser
does not already hold a development session.

## Validate

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Data status

The operational panel uses connected source data when the services are running.
Broker orders/fills, live quotes, and full risk-decision snapshots are not
persisted by Trade Ngin and therefore appear explicitly as unavailable. The
admission matrix, AlphaClock, FactorScope, and BookAtlas still use a separate
deterministic model so the QR/QT workflow can be evaluated before a versioned
research-results contract exists. Those numbers are illustrative and must not
be treated as research results, risk approval, or trading instructions. The
interface labels that boundary explicitly and never silently substitutes demo
values for a failed live source.

The detailed source, provenance, and architecture review lives in
[`docs/integration-audit.md`](docs/integration-audit.md).
