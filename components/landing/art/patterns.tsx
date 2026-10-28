/**
 * Patrones de las láminas (sistema de 400 × 400). Son abstracciones gráficas
 * de cada fuente o dimensión, no datos: ninguna posición representa un lugar real.
 * Todos los trazos usan currentColor para adaptarse al capítulo y al tema.
 */
import { areaPath, plateArea } from "./geometry";

export type SourceKind = "limites" | "recurso" | "indicadores" | "propias";
export type DimensionKind =
  | "tecnica"
  | "conexion"
  | "ambiental"
  | "social"
  | "regulatoria"
  | "seguridad"
  | "economica"
  | "global";

const cells = [
  [0.05, 0.08, 0.12, 0.16, 0.2],
  [0.07, 0.11, 0.14, 0.2, 0.25],
  [0.1, 0.13, 0.19, 0.23, 0.28],
  [0.12, 0.18, 0.21, 0.28, 0.32],
  [0.15, 0.2, 0.26, 0.3, 0.36],
];

const centroids = [
  [84, 72, 5],
  [210, 64, 4],
  [330, 92, 6],
  [118, 190, 4],
  [236, 204, 7],
  [346, 236, 4],
  [70, 318, 6],
  [196, 334, 5],
  [318, 342, 4],
];

const ownArea = "M60 70L150 48L196 96L170 150L98 168L52 128Z";
const ownHatch =
  "M144 50L194 100M131 53L189 110M119 56L184 121M106 59L179 131M94 62L174 142M81 65L167 151M69 68L155 154M59 74L142 157M58 88L130 160M56 101L117 163M54 115L105 166";

const boundaryNetwork = [
  "M0 128C70 136 130 104 196 116S320 160 400 140",
  "M168 0C176 80 150 150 176 236S158 350 184 400",
  "M0 300C90 288 190 326 400 286",
  "M296 0C286 110 318 196 292 400",
];

const flaggedArea = "M236 120L262 210L253 256L330 262L372 196L340 118Z";
const flaggedHatch =
  "M238 125L243 120M241 136L258 120M244 147L272 119M247 158L286 119M250 169L301 119M253 180L315 118M257 191L330 118M260 202L341 121M261 215L345 131M258 233L349 141M254 250L354 151M262 257L358 161M275 258L362 171M288 259L366 181M301 260L370 191M314 261L359 216M328 262L335 255";

const clusters: [number, number, [number, number][]][] = [
  [108, 112, [[0, 0], [14, -8], [-12, 10], [22, 12], [-4, -20], [8, 22], [-20, -6], [28, -2]]],
  [296, 168, [[0, 0], [12, 10], [-14, 6], [6, -14], [20, -6], [-8, 18]]],
  [184, 300, [[0, 0], [-14, -10], [16, -6], [-6, 16], [12, 18], [-22, 6], [24, 10]]],
];

const markers = [
  [84, 96],
  [312, 74],
  [252, 258],
  [116, 318],
  [344, 336],
  [200, 170],
];

const isolines = [58, 118, 178, 238, 298, 358].map(
  (y) => `M0 ${y}C90 ${y - 22} 170 ${y + 20} 260 ${y - 4}S360 ${y - 18} 400 ${y - 10}`,
);

export function SourcePattern({ kind }: { kind: SourceKind }) {
  switch (kind) {
    case "limites":
      return (
        <g className="lx-pat lx-pat--dashed">
          {boundaryNetwork.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      );
    case "recurso":
      return (
        <g className="lx-pat lx-pat--cells">
          {cells.flatMap((row, j) =>
            row.map((opacity, i) => (
              <rect key={`${i}-${j}`} x={i * 80 + 4} y={j * 80 + 4} width={72} height={72} rx={6} fillOpacity={opacity} />
            )),
          )}
        </g>
      );
    case "indicadores":
      return (
        <g className="lx-pat lx-pat--dots">
          {centroids.map(([x, y, r]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r={r} />
              <circle className="lx-pat-ring" cx={x} cy={y} r={r + 7} />
            </g>
          ))}
        </g>
      );
    case "propias":
      return (
        <g className="lx-pat">
          <path className="lx-pat-outline" d={ownArea} />
          <path d={ownHatch} />
        </g>
      );
  }
}

export function DimensionPattern({ kind }: { kind: DimensionKind }) {
  switch (kind) {
    case "tecnica":
      return (
        <g className="lx-pat">
          {isolines.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      );
    case "conexion":
      return (
        <g className="lx-pat">
          <path d="M86 296L222 118L332 298M222 118L372 40" />
          <path className="lx-pat-dash" d="M86 296L24 388M332 298L392 372" />
          {[
            [86, 296],
            [222, 118],
            [332, 298],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} className="lx-pat-solid" x={x - 7} y={y - 7} width={14} height={14} rx={2} />
          ))}
        </g>
      );
    case "ambiental":
      return (
        <g className="lx-pat">
          <path className="lx-pat-dash lx-pat-faint" d="M24 150C60 96 150 70 230 96S372 180 360 290S250 392 150 370S-6 220 24 150Z" />
          <path className="lx-pat-thick" d="M0 58C78 88 112 150 170 170S252 228 262 300S334 378 400 392" />
          <path d="M118 0C126 60 150 118 170 170M400 196C338 208 298 250 262 300M40 400C80 350 130 330 170 330" />
        </g>
      );
    case "social":
      return (
        <g className="lx-pat lx-pat--dots">
          {clusters.flatMap(([cx, cy, points]) =>
            points.map(([dx, dy]) => <circle key={`${cx + dx}-${cy + dy}`} cx={cx + dx} cy={cy + dy} r={3.2} />),
          )}
        </g>
      );
    case "regulatoria":
      return (
        <g className="lx-pat">
          <g className="lx-pat-dash">
            {boundaryNetwork.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <path className="lx-pat-outline" d={flaggedArea} />
          <path d={flaggedHatch} />
        </g>
      );
    case "seguridad":
      return (
        <g className="lx-pat">
          <circle className="lx-pat-dash lx-pat-faint" cx={252} cy={258} r={54} />
          {markers.map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x + 5} ${y - 5}L${x - 5} ${y + 5}`} />
          ))}
        </g>
      );
    case "economica":
      return (
        <g className="lx-pat lx-pat-dash lx-pat-faint">
          {[0, 1, 2, 3].flatMap((j) =>
            [0, 1, 2, 3].map((i) => <rect key={`${i}-${j}`} x={i * 100 + 14} y={j * 100 + 14} width={72} height={72} rx={6} />),
          )}
        </g>
      );
    case "global":
      return (
        <g>
          <use className="lx-plate-relief" href="/landing/relieve.svg#placa" width={400} height={400} />
          <path className="lx-footprint lx-footprint--on" d={areaPath(plateArea)} />
        </g>
      );
  }
}
