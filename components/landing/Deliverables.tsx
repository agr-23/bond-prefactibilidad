import { landing } from "../../content/landing";
import StatusTag from "./StatusTag";
import { SectionIntro } from "./ui";

export default function Deliverables() {
  const { deliverables: section } = landing;

  return (
    <section id={section.id} className="lx-deep lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead} />
        <ul className="lx-deliverables">
          {section.items.map((item) => (
            <li key={item.name} className="lx-deliverable" data-status={item.status} data-reveal>
              <span className="lx-deliverable-format">{item.format}</span>
              <h3 className="lx-deliverable-name">{item.name}</h3>
              <p className="lx-deliverable-line">{item.line}</p>
              <StatusTag status={item.status} className="lx-deliverable-status" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
