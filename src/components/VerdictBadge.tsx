import { CheckCircle2, CircleHelp, ShieldX } from 'lucide-react';
import type { Verdict } from '../model';

interface VerdictBadgeProps {
  verdict: Verdict;
  compact?: boolean;
}

export function VerdictBadge({ verdict, compact = false }: VerdictBadgeProps) {
  const Icon = verdict === 'PASS' ? CheckCircle2 : verdict === 'FAIL' ? ShieldX : CircleHelp;
  return (
    <span className={`status-pill ${verdict.toLowerCase()} ${compact ? 'compact' : ''}`}>
      <Icon aria-hidden="true" size={compact ? 13 : 16} /> {verdict}
    </span>
  );
}
