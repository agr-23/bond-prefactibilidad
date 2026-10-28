import type { CSSProperties, ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { DecisionState } from "../../content/landing";

/** Variables CSS en línea (p. ej. índices de escalonado). */
export function cssVars(vars: Record<string, string | number>) {
  return vars as CSSProperties;
}

export function SectionIntro({
  id,
  eyebrow,
  title,
  lead,
  className = "",
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={`lx-intro ${className}`}>
      <p className="lx-eyebrow" data-reveal>
        {eyebrow}
      </p>
      <h2 id={`${id}-title`} className="lx-headline" data-reveal>
        {title}
      </h2>
      {lead ? (
        <p className="lx-lead" data-reveal>
          {lead}
        </p>
      ) : null}
      {children}
    </header>
  );
}

export function Chevron() {
  return (
    <svg className="lx-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const decisionIcons = {
  go: CircleCheck,
  conditional: CircleAlert,
  nogo: CircleX,
} as const;

/** Ícono + nombre del estado: el color acompaña, no reemplaza, la señal. */
export function DecisionMark({ state, size = 18 }: { state: DecisionState; size?: number }) {
  const Icon = decisionIcons[state.id];
  return (
    <span className="lx-decision-mark" data-decision={state.id}>
      <Icon size={size} strokeWidth={1.9} aria-hidden="true" />
      <span>{state.name}</span>
    </span>
  );
}
