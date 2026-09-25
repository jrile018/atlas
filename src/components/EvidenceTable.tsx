import type { EvidenceRow } from '../model';
import { PanelHeading } from './PanelHeading';
import { VerdictBadge } from './VerdictBadge';

interface EvidenceTableProps {
  rows: EvidenceRow[];
}

export function EvidenceTable({ rows }: EvidenceTableProps) {
  return (
    <section className="panel evidence-panel" aria-label="Decision evidence">
      <PanelHeading
        eyebrow="Decision ledger"
        title="Every gate, one audit trail"
        aside={<span className="panel-kicker">Deterministic demo calculations</span>}
      />
      <div className="evidence-scroll">
        <table className="evidence-table">
          <thead>
            <tr>
              <th scope="col">Gate</th>
              <th scope="col">Test</th>
              <th scope="col">Modeled result</th>
              <th scope="col">Threshold</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.gate}-${row.test}`}>
                <td>{row.gate}</td>
                <th scope="row">{row.test}</th>
                <td>{row.observed}</td>
                <td>{row.threshold}</td>
                <td><VerdictBadge verdict={row.verdict} compact /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
