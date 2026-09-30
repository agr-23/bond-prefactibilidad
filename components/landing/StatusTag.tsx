import { landing, type StatusKey } from "../../content/landing";

/** Forma distinta por estado: el color nunca es la única señal. */
function StatusGlyph({ status }: { status: StatusKey }) {
  const common = { width: 10, height: 10, viewBox: "0 0 10 10", "aria-hidden": true } as const;
  switch (status) {
    case "indice":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="4" fill="currentColor" />
        </svg>
      );
    case "contexto":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case "proximamente":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 1.6" />
        </svg>
      );
    case "disponible":
      return (
        <svg {...common}>
          <path d="M1.6 5.3 4 7.6 8.6 2.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "desarrollo":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 1.5a3.5 3.5 0 0 1 0 7Z" fill="currentColor" />
        </svg>
      );
  }
}

export default function StatusTag({ status, className = "" }: { status: StatusKey; className?: string }) {
  return (
    <span className={`lx-tag ${className}`} data-status={status}>
      <StatusGlyph status={status} />
      {landing.statusLabels[status].label}
    </span>
  );
}

/** Leyenda de etiquetas con su significado. */
export function StatusLegend({ statuses, className = "" }: { statuses: StatusKey[]; className?: string }) {
  return (
    <dl className={`lx-legend ${className}`}>
      {statuses.map((status) => (
        <div key={status} className="lx-legend-row">
          <dt>
            <StatusTag status={status} />
          </dt>
          <dd>{landing.statusLabels[status].meaning}</dd>
        </div>
      ))}
    </dl>
  );
}
