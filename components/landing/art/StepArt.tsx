/**
 * Piezas de la escena "Cómo funciona". El escenario fijo de escritorio las
 * combina y cambia de estado con atributos data-* (trace, tilt, inputs,
 * layers, compress, index, result); en móvil y con movimiento reducido cada
 * paso muestra solo su pieza, en estado final.
 * Las barras son esquemáticas: no muestran cifras ni datos reales.
 */
import { landing } from "../../../content/landing";
import StatusTag from "../StatusTag";
import { DecisionMark, cssVars } from "../ui";
import { areaPath, edgePaths, plateArea, plateBoundaries, plateShares } from "./geometry";
import { SourcePattern, type SourceKind } from "./patterns";

const sources: SourceKind[] = ["limites", "recurso", "indicadores", "propias"];

function BasePlate() {
  const edges = edgePaths(plateArea);
  return (
    <div className="lx-plate lx-plate--base">
      <svg viewBox="0 0 400 400" className="lx-plate-svg">
        <rect className="lx-plate-bg" x="1" y="1" width="398" height="398" rx="20" />
        <use className="lx-plate-relief" href="/landing/relieve.svg#placa" width={400} height={400} />
        <g className="lx-cross">
          {plateShares.map((share) => (
            <path key={share.d} className="lx-share" d={share.d} style={cssVars({ "--o": share.opacity })} />
          ))}
          {plateBoundaries.map((d) => (
            <path key={d} className="lx-boundary" d={d} />
          ))}
        </g>
        <path className="lx-area-fill" d={areaPath(plateArea)} />
        {edges.map((d, i) => (
          <path key={d} className="lx-edge" d={d} pathLength={1} style={cssVars({ "--i": i })} />
        ))}
        {plateArea.map(([x, y], i) => (
          <circle key={`${x}-${y}`} className="lx-vertex" cx={x} cy={y} r={4.5} style={cssVars({ "--i": i })} />
        ))}
      </svg>
    </div>
  );
}

function SourcePlate({ kind, index }: { kind: SourceKind; index: number }) {
  return (
    <div className="lx-plate lx-layer" style={cssVars({ "--i": index })}>
      <svg viewBox="0 0 400 400" className="lx-plate-svg">
        <rect className="lx-plate-bg lx-plate-bg--layer" x="1" y="1" width="398" height="398" rx="20" />
        <SourcePattern kind={kind} />
        <path className="lx-footprint" d={areaPath(plateArea)} />
      </svg>
    </div>
  );
}

export function StagePlane({ withLayers = false }: { withLayers?: boolean }) {
  return (
    <div className="lx-plane">
      <BasePlate />
      {withLayers ? sources.map((kind, index) => <SourcePlate key={kind} kind={kind} index={index} />) : null}
    </div>
  );
}

export function InputsPanel() {
  const { stage } = landing.howItWorks;
  return (
    <div className="lx-panel lx-panel--inputs">
      <p className="lx-panel-label">{stage.technologyLabel}</p>
      <div className="lx-seg">
        {stage.technologies.map((technology, i) => (
          <span key={technology} className={i === 0 ? "lx-seg-on" : undefined}>
            {technology}
          </span>
        ))}
      </div>
      <div className="lx-field">
        <span className="lx-panel-label">{stage.capacity}</span>
        <span className="lx-field-value" aria-hidden="true">
          —
        </span>
      </div>
    </div>
  );
}

export function LayersLegend() {
  const { stage } = landing.howItWorks;
  return (
    <div className="lx-panel lx-panel--legend">
      <p className="lx-panel-label">{stage.layersTitle}</p>
      <ol>
        {[...stage.layers].reverse().map((layer) => (
          <li key={layer}>{layer}</li>
        ))}
      </ol>
    </div>
  );
}

const indexBars = [0.72, 0.46, 0.6];

export function IndexPanel() {
  const { index } = landing.howItWorks.stage;
  return (
    <div className="lx-panel lx-panel--index">
      <p className="lx-panel-title">{index.title}</p>
      <ul>
        {index.criteria.map((criterion, i) => (
          <li key={criterion}>
            <span>{criterion}</span>
            <span className="lx-bar">
              <span className="lx-bar-fill" style={cssVars({ "--v": indexBars[i], "--i": i })} />
            </span>
          </li>
        ))}
        <li className="lx-panel-coverage">
          <span>{index.coverage}</span>
          <span className="lx-bar lx-bar--thin">
            <span className="lx-bar-fill" style={cssVars({ "--v": 0.82, "--i": 3 })} />
          </span>
        </li>
      </ul>
    </div>
  );
}

export function ResultCard() {
  const { result } = landing.howItWorks.stage;
  const { states } = landing.decision;
  return (
    <div className="lx-panel lx-panel--result">
      <p className="lx-panel-title">{result.title}</p>
      <ul className="lx-result-rows">
        <li>
          <span>{result.rows[0]}</span>
          <span className="lx-bar">
            <span className="lx-bar-fill" style={cssVars({ "--v": 0.64, "--i": 0 })} />
          </span>
        </li>
        <li>
          <span>{result.rows[1]}</span>
          <span className="lx-bar">
            <span className="lx-bar-fill" style={cssVars({ "--v": 0.82, "--i": 1 })} />
          </span>
        </li>
        <li>
          <span>{result.rows[2]}</span>
          <span className="lx-bar lx-bar--split">
            {plateShares.map((share, i) => (
              <span key={share.d} style={cssVars({ "--o": 0.35 + i * 0.25, flexGrow: share.share })} />
            ))}
          </span>
        </li>
      </ul>
      <div className="lx-result-decision">
        <div className="lx-result-decision-head">
          <p className="lx-panel-label">{result.decisionTitle}</p>
          <StatusTag status="desarrollo" />
        </div>
        <div className="lx-result-states">
          {states.map((state) => (
            <DecisionMark key={state.id} state={state} size={15} />
          ))}
        </div>
      </div>
    </div>
  );
}
