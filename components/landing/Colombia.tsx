import { landing } from "../../content/landing";
import StatusTag from "./StatusTag";
import { SectionIntro } from "./ui";

export default function Colombia() {
  const { colombia: section } = landing;

  return (
    <section id={section.id} className="lx-paper lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead} />

        <dl className="lx-figures">
          {section.figures.map((figure) => (
            <div key={figure.value} className="lx-figure-stat" data-reveal>
              <dt className="lx-figure-value">{figure.value}</dt>
              <dd className="lx-figure-caption">{figure.caption}</dd>
            </div>
          ))}
        </dl>

        <div className="lx-columns">
          <div data-reveal>
            <h3 className="lx-column-title">{section.todayTitle}</h3>
            <ul className="lx-rows">
              {section.today.map((item) => (
                <li key={item.name} className="lx-row">
                  <div className="lx-row-head">
                    <h4 className="lx-row-name">{item.name}</h4>
                    {item.status ? <StatusTag status={item.status} /> : null}
                  </div>
                  <p className="lx-row-line">{item.line}</p>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal>
            <h3 className="lx-column-title">{section.verifyTitle}</h3>
            <p className="lx-column-note">{section.verifyNote}</p>
            <ul className="lx-rows">
              {section.verify.map((item) => (
                <li key={item.name} className="lx-row">
                  <h4 className="lx-row-name">{item.name}</h4>
                  <p className="lx-row-line">{item.line}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
