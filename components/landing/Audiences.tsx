import { landing } from "../../content/landing";
import { SectionIntro } from "./ui";

export default function Audiences() {
  const { audiences: section } = landing;

  return (
    <section id={section.id} className="lx-paper lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead} />
        <ul className="lx-audiences">
          {section.items.map((item) => (
            <li key={item.role} className="lx-audience" data-reveal>
              <h3 className="lx-audience-role">{item.role}</h3>
              <p className="lx-audience-decision">{item.decision}</p>
              <p className="lx-audience-line">{item.line}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
