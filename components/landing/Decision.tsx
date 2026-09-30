import { landing } from "../../content/landing";
import DecisionScene from "./DecisionScene";
import StatusTag from "./StatusTag";
import { DecisionMark, SectionIntro, cssVars } from "./ui";

const formatNumber = (value: number, decimals: number) =>
  new Intl.NumberFormat("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);

/** Número que cuenta hacia arriba; los lectores de pantalla reciben solo el valor final. */
function Count({ value, decimals, suffix }: { value: number; decimals: number; suffix?: string }) {
  const text = formatNumber(value, decimals);
  return (
    <>
      <span className="lx-count" aria-hidden="true" data-count-to={value} data-decimals={decimals} style={cssVars({ "--w": `${text.length}ch` })}>
        {text}
      </span>
      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
      <span className="sr-only">
        {text}
        {suffix}
      </span>
    </>
  );
}

export default function Decision() {
  const { decision: section } = landing;
  const { example } = section;

  return (
    <section id={section.id} className="lx-paper lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead} />
        <DecisionScene>
          <div className="lx-decision-grid">
            <article className="lx-card lx-decision-card" data-scene-item="" aria-labelledby="decision-estados">
              <h3 id="decision-estados" className="lx-subtitle">
                {section.statesTitle}
              </h3>
              <ul className="lx-states">
                {section.states.map((state) => (
                  <li key={state.id} data-decision={state.id}>
                    <DecisionMark state={state} size={22} />
                    <p>{state.rule}</p>
                  </li>
                ))}
              </ul>
              <p className="lx-card-note">
                <StatusTag status={section.automation.status} />
                <span>{section.automation.text}</span>
              </p>
            </article>

            <article className="lx-card lx-example-card" data-scene-item="" aria-labelledby="decision-ejemplo">
              <p className="lx-example-label">{example.label}</p>
              <h3 id="decision-ejemplo" className="lx-subtitle">
                {example.title}
              </h3>
              <p className="lx-card-intro">{example.intro}</p>

              <h4 className="lx-card-kicker">{example.sharesTitle}</h4>
              <ul className="lx-shares">
                {example.shares.map((municipality) => (
                  <li key={municipality.name}>
                    <div className="lx-share-head">
                      <span className="lx-share-name">
                        {municipality.name}
                        {municipality.missing ? <span className="lx-missing">{example.missingTag}</span> : null}
                      </span>
                      <span className="lx-share-value">
                        <Count value={municipality.share} decimals={2} suffix={" %"} />
                      </span>
                    </div>
                    <span className="lx-share-bar" aria-hidden="true">
                      <span className="lx-share-fill" style={cssVars({ "--v": municipality.share / 100 })} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="lx-missing-note">{example.missingNote}</p>

              <h4 className="lx-card-kicker">{example.readingsTitle}</h4>
              <dl className="lx-readings">
                {example.readings.map((reading) => (
                  <div key={reading.label}>
                    <dt>{reading.label}</dt>
                    <dd>
                      <Count value={reading.value} decimals={reading.decimals} />
                      <span className="lx-reading-unit">{reading.unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="lx-caption">{example.footnote}</p>
            </article>
          </div>
        </DecisionScene>
      </div>
    </section>
  );
}
