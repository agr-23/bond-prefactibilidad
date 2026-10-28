// Genera el relieve ficticio de la landing.
//
// Las curvas de nivel salen de un campo de alturas sintético (suma de
// elevaciones gaussianas con semilla fija) trazado con marching squares.
// No representan ningún lugar real.
//
// Salidas:
//   public/landing/relieve.svg              símbolos #hero y #placa (currentColor, non-scaling-stroke)
//   components/landing/art/hero-projection.ts  área de estudio del hero ya proyectada
//
// El relieve del hero se proyecta en perspectiva aquí, al generarlo: la página
// lo muestra como SVG 2D, sin transformaciones 3D en CSS, y se ve igual en
// cualquier motor.
//
// Uso: node scripts/generate-landing-terrain.mjs
import { mkdir, writeFile } from "node:fs/promises";

/**
 * Plano inclinado visto por una cámara, en unidades del plano: inclinación en
 * grados, distancia focal y altura del punto de fuga sobre el borde cercano.
 */
const HERO_CAMERA = { tilt: 63, focal: 815, eye: 725 };

/** Área de estudio del hero, en coordenadas del plano (1600 × 1000, y hacia abajo). */
const HERO_AREA = [
  [664, 506],
  [790, 456],
  [934, 482],
  [1024, 556],
  [998, 664],
  [866, 714],
  [724, 700],
  [636, 614],
];

const TERRAINS = [
  { id: "hero", width: 1600, height: 1000, cell: 10, levels: 30, seed: 5, bumps: 16, tolerance: 1.2, decimals: 0, camera: HERO_CAMERA },
  { id: "placa", width: 400, height: 400, cell: 5, levels: 18, seed: 13, bumps: 10, tolerance: 0.8, decimals: 1 },
];

function random(seed) {
  let state = seed >>> 0;
  return () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function heightField({ width, height, seed, bumps: count }) {
  const rand = random(seed);
  const bumps = Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    sx: 0.08 + rand() * 0.16,
    sy: 0.06 + rand() * 0.12,
    a: (rand() - 0.4) * 1.1,
    r: rand() * Math.PI,
  }));
  return (u, v) => {
    let z = 0.28 * u + 0.12 * v;
    for (const b of bumps) {
      const dx = u - b.x;
      const dy = (v - b.y) * (height / width);
      const px = dx * Math.cos(b.r) - dy * Math.sin(b.r);
      const py = dx * Math.sin(b.r) + dy * Math.cos(b.r);
      z += b.a * Math.exp(-(px * px) / (2 * b.sx * b.sx) - (py * py) / (2 * b.sy * b.sy));
    }
    return z + 0.035 * Math.sin(9 * u + 3 * v) * Math.cos(7 * v - 2 * u);
  };
}

/**
 * Proyección en perspectiva de un punto del plano. El borde inferior del plano
 * (y = alto) queda al frente; el superior se aleja. Devuelve coordenadas de
 * pantalla con el borde cercano en y = 0 hacia arriba (negativo).
 */
function projector({ width, height, camera }) {
  const angle = (camera.tilt * Math.PI) / 180;
  return ([u, v]) => {
    const depth = height - v;
    const x = u - width / 2;
    const y = depth * Math.cos(angle);
    const z = depth * Math.sin(angle);
    const scale = camera.focal / (camera.focal + z);
    return [width / 2 + x * scale, -(camera.eye + (y - camera.eye) * scale)];
  };
}

const EDGES = {
  1: ["l", "b"], 2: ["b", "r"], 3: ["l", "r"], 4: ["t", "r"], 6: ["t", "b"], 7: ["l", "t"],
  8: ["l", "t"], 9: ["t", "b"], 11: ["t", "r"], 12: ["l", "r"], 13: ["b", "r"], 14: ["l", "b"],
};

function contourSegments(grid, nx, ny, cell, level) {
  const segments = [];
  const point = (i, j) => [i * cell, j * cell];
  const lerp = (a, b, za, zb) => {
    const t = (level - za) / (zb - za);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const z0 = grid[j][i], z1 = grid[j][i + 1], z2 = grid[j + 1][i + 1], z3 = grid[j + 1][i];
      const p0 = point(i, j), p1 = point(i + 1, j), p2 = point(i + 1, j + 1), p3 = point(i, j + 1);
      const code = (z0 > level ? 8 : 0) | (z1 > level ? 4 : 0) | (z2 > level ? 2 : 0) | (z3 > level ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const edge = {
        t: () => lerp(p0, p1, z0, z1),
        r: () => lerp(p1, p2, z1, z2),
        b: () => lerp(p3, p2, z3, z2),
        l: () => lerp(p0, p3, z0, z3),
      };
      if (code === 5) segments.push([edge.l(), edge.t()], [edge.b(), edge.r()]);
      else if (code === 10) segments.push([edge.l(), edge.b()], [edge.t(), edge.r()]);
      else segments.push([edge[EDGES[code][0]](), edge[EDGES[code][1]]()]);
    }
  }
  return segments;
}

const keyOf = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;

function joinSegments(segments) {
  const byPoint = new Map();
  segments.forEach((segment, index) => {
    for (const p of segment) {
      const key = keyOf(p);
      if (!byPoint.has(key)) byPoint.set(key, []);
      byPoint.get(key).push(index);
    }
  });
  const used = new Set();
  const lines = [];
  for (let index = 0; index < segments.length; index++) {
    if (used.has(index)) continue;
    used.add(index);
    const line = [...segments[index]];
    for (const forward of [true, false]) {
      for (;;) {
        const end = forward ? line[line.length - 1] : line[0];
        const next = (byPoint.get(keyOf(end)) ?? []).find((candidate) => !used.has(candidate));
        if (next === undefined) break;
        used.add(next);
        const [a, b] = segments[next];
        const other = keyOf(a) === keyOf(end) ? b : a;
        if (forward) line.push(other);
        else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines;
}

function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const a = points[0], b = points[points.length - 1];
  let maxDistance = 0, split = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const distance = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1);
    if (distance > maxDistance) {
      maxDistance = distance;
      split = i;
    }
  }
  if (maxDistance <= epsilon) return [a, b];
  return [...simplify(points.slice(0, split + 1), epsilon).slice(0, -1), ...simplify(points.slice(split), epsilon)];
}

const lengthOf = (line) => line.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);

// Catmull-Rom a Bézier cúbica: curvas suaves con pocos puntos.
function smoothPath(points, round) {
  const closed = keyOf(points[0]) === keyOf(points[points.length - 1]);
  if (points.length < 3) return `M${round(points[0][0])} ${round(points[0][1])}L${round(points[1][0])} ${round(points[1][1])}`;
  const count = points.length;
  const at = (i) => (closed ? points[((i % (count - 1)) + (count - 1)) % (count - 1)] : points[Math.max(0, Math.min(count - 1, i))]);
  let d = `M${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 0; i < count - 1; i++) {
    const p0 = at(i - 1), p1 = points[i], p2 = points[i + 1], p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

function build(config) {
  const { id, width, height, cell, levels, tolerance, decimals, camera } = config;
  const precision = 10 ** decimals;
  const round = (value) => String(Math.round(value * precision) / precision);
  const field = heightField(config);
  const nx = Math.ceil(width / cell), ny = Math.ceil(height / cell);
  const grid = [];
  let min = Infinity, max = -Infinity;
  for (let j = 0; j <= ny; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) {
      const z = field(i / nx, j / ny);
      row.push(z);
      min = Math.min(min, z);
      max = Math.max(max, z);
    }
    grid.push(row);
  }

  const project = camera ? projector(config) : (p) => p;
  let lines = [];
  for (let k = 1; k < levels; k++) {
    const level = min + ((max - min) * k) / levels;
    for (const line of joinSegments(contourSegments(grid, nx, ny, cell, level))) {
      const simple = simplify(line, tolerance);
      if (simple.length >= 2 && lengthOf(simple) >= cell * 3) lines.push({ k, points: simple.map(project) });
    }
  }

  // Marco del símbolo: la huella proyectada del plano.
  let viewBox = [0, 0, width, height];
  if (camera) {
    const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(project);
    const top = Math.min(...corners.map(([, y]) => y));
    const bottom = Math.max(...corners.map(([, y]) => y));
    lines = lines.map((line) => ({ ...line, points: line.points.map(([x, y]) => [x, y - top]) }));
    viewBox = [0, 0, width, Math.ceil(bottom - top)];
    config.offsetY = top;
  }

  const byLevel = new Map();
  for (const line of lines) {
    if (!byLevel.has(line.k)) byLevel.set(line.k, []);
    byLevel.get(line.k).push(smoothPath(line.points, round));
  }
  const paths = [...byLevel.entries()].map(([k, ds]) => {
    const major = k % 4 === 0;
    return `<path d="${ds.join("")}" stroke-opacity="${major ? 0.9 : 0.45}" stroke-width="${major ? 1.25 : 1}" vector-effect="non-scaling-stroke"/>`;
  });
  return {
    svg: `<symbol id="${id}" viewBox="${viewBox.join(" ")}"><g fill="none" stroke="currentColor">${paths.join("")}</g></symbol>`,
    viewBox,
    project: (p) => {
      const [x, y] = project(p);
      return [Math.round(x), Math.round(y - (config.offsetY ?? 0))];
    },
  };
}

const [hero, plate] = TERRAINS.map(build);
const svg = `<svg xmlns="http://www.w3.org/2000/svg"><!-- Relieve ficticio generado por scripts/generate-landing-terrain.mjs. No representa un lugar real. -->${hero.svg}${plate.svg}</svg>\n`;

const projected = HERO_AREA.map(hero.project);
const projectionModule = `// Generado por scripts/generate-landing-terrain.mjs. No editar a mano.
// Área de estudio del hero, proyectada en perspectiva sobre el símbolo #hero.
import type { Point } from "./geometry";

export const HERO_VIEWBOX = [${hero.viewBox.join(", ")}] as const;

export const heroArea: readonly Point[] = [
${projected.map(([x, y]) => `  [${x}, ${y}],`).join("\n")}
];
`;

await mkdir(new URL("../public/landing/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/landing/relieve.svg", import.meta.url), svg);
await writeFile(new URL("../components/landing/art/hero-projection.ts", import.meta.url), projectionModule);
console.log(`public/landing/relieve.svg (${(svg.length / 1024).toFixed(1)} KB), hero ${hero.viewBox.join(" ")}`);
