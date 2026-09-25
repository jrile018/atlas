import type { ReactNode } from 'react';

interface PanelHeadingProps {
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}

export function PanelHeading({ eyebrow, title, aside }: PanelHeadingProps) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {aside ? <div className="panel-heading-aside">{aside}</div> : null}
    </div>
  );
}
