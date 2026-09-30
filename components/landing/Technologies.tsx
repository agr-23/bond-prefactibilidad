import { landing } from "../../content/landing";
import { SectionIntro } from "./ui";

export default function Technologies() {
  const { technologies: section } = landing;

  return (
    <section id={section.id} className="lx-deep lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead} />
        <ul className="lx-techs">
          {section.items.map((technology) => (
            <li key={technology.name} className="lx-tech" data-reveal>
              <p className="lx-tech-resource">{technology.resource}</p>
              <h3 className="lx-tech-name">{technology.name}</h3>
              <p className="lx-tech-line">{technology.line}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
