import { landing } from "../../content/landing";
import { SectionIntro } from "./ui";

export default function Problem() {
  const { problem } = landing;

  return (
    <section id={problem.id} className="lx-paper lx-section bg-canvas text-ink" aria-labelledby={`${problem.id}-title`}>
      <div className="lx-container">
        <SectionIntro id={problem.id} eyebrow={problem.eyebrow} title={problem.title} lead={problem.lead} />
        <ol className="lx-costs">
          {problem.costs.map((cost, i) => (
            <li key={cost.name} className="lx-cost" data-reveal>
              <span className="lx-cost-index" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <strong className="lx-cost-name">{cost.name}</strong>
              <span className="lx-cost-line">{cost.line}</span>
            </li>
          ))}
        </ol>
        <p className="lx-statement" data-reveal>
          {problem.closing}
        </p>
      </div>
    </section>
  );
}
