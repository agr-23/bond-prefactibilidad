import { landing } from "../../content/landing";
import StatusTag from "./StatusTag";
import StepsScene from "./StepsScene";
import { IndexPanel, InputsPanel, LayersLegend, ResultCard, StagePlane } from "./art/StepArt";
import { SectionIntro } from "./ui";

/** Figura estática de cada paso para móvil y movimiento reducido. */
function StepFigure({ step }: { step: number }) {
  switch (step) {
    case 1:
      return (
        <div className="lx-stage lx-figure" data-trace="">
          <StagePlane />
        </div>
      );
    case 2:
      return (
        <div className="lx-figure lx-figure--panel">
          <InputsPanel />
        </div>
      );
    case 3:
      return (
        <div className="lx-figure lx-figure--stack">
          <div className="lx-stage" data-trace="" data-tilt="" data-layers="">
            <StagePlane withLayers />
          </div>
          <LayersLegend />
        </div>
      );
    case 4:
      return (
        <div className="lx-figure lx-figure--panel">
          <IndexPanel />
        </div>
      );
    default:
      return (
        <div className="lx-figure lx-figure--panel">
          <ResultCard />
        </div>
      );
  }
}

export default function HowItWorks() {
  const { howItWorks: section } = landing;

  return (
    <section id={section.id} className="lx-deep bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container lx-section-head">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead} />
      </div>
      <StepsScene>
        <div className="lx-container lx-steps-grid">
          <ol className="lx-steps-list">
            {section.steps.map((step, i) => (
              <li key={step.title} className="lx-step" data-step-index={i + 1}>
                <div className="lx-step-copy">
                  <p className="lx-step-number">
                    {section.stepLabel} {i + 1}
                  </p>
                  <h3 className="lx-title">{step.title}</h3>
                  <p className="lx-lead">{step.body}</p>
                  <p className="lx-body lx-step-detail">{step.detail}</p>
                  {step.pending ? (
                    <p className="lx-step-pending">
                      <StatusTag status={step.pending.status} />
                      <span>{step.pending.text}</span>
                    </p>
                  ) : null}
                </div>
                <div className="lx-step-figure" aria-hidden="true">
                  <StepFigure step={i + 1} />
                </div>
              </li>
            ))}
          </ol>
          <div className="lx-steps-stage" aria-hidden="true">
            {/* Estado final por defecto: sin JavaScript se ve el resultado completo. */}
            <div
              className="lx-stage lx-stage--live"
              data-trace=""
              data-tilt=""
              data-layers=""
              data-compress=""
              data-result=""
            >
              <StagePlane withLayers />
              <InputsPanel />
              <LayersLegend />
              <IndexPanel />
              <ResultCard />
            </div>
          </div>
        </div>
      </StepsScene>
    </section>
  );
}
