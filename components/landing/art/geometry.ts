/**
 * Geometría ficticia de las ilustraciones de la landing.
 * Ninguna coordenada representa un lugar real.
 *
 * Láminas: sistema de 400 × 400 (y hacia abajo).
 * Hero: ver hero-projection.ts (generado junto con el relieve en perspectiva).
 */
export type Point = readonly [number, number];

/** Área de estudio dibujada sobre la lámina. */
export const plateArea: readonly Point[] = [
  [142, 158],
  [212, 128],
  [286, 150],
  [302, 222],
  [262, 286],
  [178, 292],
  [128, 236],
];

/** Límites municipales ficticios que cruzan el área. */
export const plateBoundaries = [
  "M250 0L236 120L262 210L253 256L244 300L270 400",
  "M0 262L120 250L200 268L253 256",
];

/** Partes del área en cada municipio ficticio (intersecciones precalculadas). */
export const plateShares = [
  { d: "M128 236L145.7 255.8L200 268L253 256L262 210L240.8 136.6L212 128L142 158Z", share: 66.2, opacity: 0.22 },
  { d: "M240.8 136.6L262 210L253 256L246.6 287.1L262 286L302 222L286 150Z", share: 23, opacity: 0.12 },
  { d: "M145.7 255.8L178 292L246.6 287.1L253 256L200 268Z", share: 10.8, opacity: 0.34 },
];

export function areaPath(points: readonly Point[]) {
  return `M${points.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
}

/** Un trazo por lado, en el orden en que se dibuja el polígono. */
export function edgePaths(points: readonly Point[]) {
  return points.map(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    return `M${x} ${y}L${nx} ${ny}`;
  });
}
