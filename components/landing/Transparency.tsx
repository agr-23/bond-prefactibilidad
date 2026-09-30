import { landing } from "../../content/landing";
import { StatusLegend } from "./StatusTag";
import { SectionIntro } from "./ui";

export default function Transparency() {
  const { transparency: section } = landing;

  return (
    <section id={section.id} className="lx-deep lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} />

        <div className="lx-truth">
          <div className="lx-truth-column" data-reveal>
            <h3 className="lx-column-title">{section.isTitle}</h3>
            <ul>
              {section.is.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="lx-truth-column" data-reveal>
            <h3 className="lx-column-title">{section.isNotTitle}</h3>
            <ul>
              {section.isNot.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="lx-truth-coverage" data-reveal>
          {section.coverage}
        </p>

        <div className="lx-truth-legend" data-reveal>
          <h3 className="lx-column-title">{section.legendTitle}</h3>
          <StatusLegend statuses={["indice", "contexto", "disponible", "proximamente", "desarrollo"]} />
        </div>

        <p className="lx-statement lx-truth-closing" data-reveal>
          {section.closing}
        </p>
      </div>
    </section>
  );
}
