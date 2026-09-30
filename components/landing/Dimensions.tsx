import { landing } from "../../content/landing";
import LayersScene from "./LayersScene";
import StatusTag, { StatusLegend } from "./StatusTag";
import { DimensionPattern, type DimensionKind } from "./art/patterns";
import { SectionIntro, cssVars } from "./ui";

export default function Dimensions() {
  const { dimensions: section } = landing;
  const count = section.items.length;
  // Láminas de abajo hacia arriba: la primera dimensión del texto queda arriba.
  const plates = [...section.items].reverse();

  return (
    <section id={section.id} className="lx-paper bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container lx-section-head">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead}>
          <div className="lx-intro-legend" data-reveal>
            <p className="lx-legend-title">{section.legendTitle}</p>
            <StatusLegend statuses={["indice", "contexto", "proximamente"]} />
          </div>
        </SectionIntro>
      </div>

      <LayersScene>
        <div className="lx-layers" style={cssVars({ "--count": count })}>
          <div className="lx-layers-sticky">
            <div className="lx-layers-stage" aria-hidden="true">
              <div className="lx-layers-stack">
                {plates.map((item, i) => (
                  <div key={item.id} className="lx-dim-plate" data-status={item.status} style={cssVars({ "--i": i })}>
                    <svg viewBox="0 0 400 400" className="lx-plate-svg">
                      <rect className="lx-plate-bg" x="1" y="1" width="398" height="398" rx="20" />
                      <DimensionPattern kind={item.id as DimensionKind} />
                      <rect className="lx-dim-plate-hi" x="1" y="1" width="398" height="398" rx="20" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
            <ol className="lx-dims">
              {section.items.map((item, k) => (
                <li
                  key={item.id}
                  className="lx-dim"
                  data-side={k % 2 === 0 ? "left" : "right"}
                  style={cssVars({ "--i": count - 1 - k, "--k": k })}
                >
                  <div className="lx-dim-inner">
                    <div className="lx-dim-head">
                      <h3 className="lx-dim-name">{item.name}</h3>
                      <StatusTag status={item.status} />
                    </div>
                    <p className="lx-dim-line">{item.line}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="lx-layers-caption">{section.mergedCaption}</p>
          </div>
          {/* Zonas de fase para el respaldo por IntersectionObserver (LayersScene). En un
              contenedor de 250vh, el centro de pantalla recorre del 20 % al 80 %: la fase 1
              empieza al 12 % del avance (27 %) y la 3 al 85 % (71 %). */}
          <span className="lx-layers-zone" data-phase-at="1" style={cssVars({ top: "27%", height: "44%" })} />
          <span className="lx-layers-zone" data-phase-at="3" style={cssVars({ top: "71%", bottom: "0" })} />
        </div>
      </LayersScene>
    </section>
  );
}
