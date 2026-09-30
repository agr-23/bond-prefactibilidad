import { Plus } from "lucide-react";
import { landing } from "../../content/landing";
import { SectionIntro } from "./ui";

/** Acordeón nativo con <details>: accesible con teclado y sin JavaScript. */
export default function Faq() {
  const { faq: section, nav } = landing;

  return (
    <section id={section.id} className="lx-paper lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container lx-faq-layout">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} />
        <div className="lx-faq">
          {section.items.map((item, i) => (
            <details key={item.question} className="lx-faq-item">
              <summary>
                <span className="lx-faq-question">{item.question}</span>
                <Plus className="lx-faq-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
              </summary>
              <div className="lx-faq-answer">
                <p>{item.answer}</p>
                {i === section.items.length - 1 ? (
                  <p className="lx-faq-links">
                    <a className="lx-link" href={nav.cta.href}>
                      {nav.cta.label}
                    </a>
                    <a className="lx-link" href={nav.platform.href}>
                      {nav.platform.label}
                    </a>
                  </p>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
