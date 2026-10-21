// Regenera el asset de transformadores de EPM a partir del GeoJSON público de ETER.
// Entrada: transformadores.geojson (capa 0 de CREG030/Semaforo_Transformador, EPSG:4326).
// Salida: public/data/transformadores/{index.json, <cx>_<cy>.json}, fragmentos de 0.5°.
// Uso: node scripts/generar-transformadores-epm.mjs transformadores.geojson public/data/transformadores
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {join} from "node:path";
const [input, outdir] = process.argv.slice(2);
if (!input || !outdir) { console.error("uso: node generar-transformadores-epm.mjs <geojson> <outdir>"); process.exit(1); }
const P = "SIGMAENERGIA.MOV_VETRANSFO_PT.", C = "CREG030.C30_CALCULO_SEMAFORO.";
const COLOR = { VERDE: "V", AMARILLO: "A", NARANJA: "N", ROJO: "R" };
const SHARD = 0.5;
const d = JSON.parse(readFileSync(input, "utf8"));
const shards = new Map();
for (const f of d.features) {
  const g = f.geometry; if (!g) continue;
  const [lon, lat] = g.coordinates, pr = f.properties;
  const cap = Number(pr[P + "CAPACIDAD_NOMINAL"]);
  const rec = [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5,
    COLOR[pr[C + "COLOR_POTENCIA"]] ?? "?", COLOR[pr[C + "COLOR_ENERGIA"]] ?? "?",
    Number.isFinite(cap) ? Math.round(cap * 10) / 10 : null,
    (pr[P + "MUNICIPIO"] ?? "").slice(0, 40), (pr[P + "SUBESTACION_CONN"] ?? "").slice(0, 40),
    pr[P + "TENSION_CREG"] ?? null];
  const key = Math.floor(lon / SHARD) + "_" + Math.floor(lat / SHARD);
  (shards.get(key) ?? shards.set(key, []).get(key)).push(rec);
}
mkdirSync(outdir, { recursive: true });
const cells = [];
for (const [key, recs] of [...shards].sort()) {
  writeFileSync(join(outdir, key + ".json"), JSON.stringify({ cell: key, records: recs }));
  const [cx, cy] = key.split("_").map(Number);
  cells.push({ key, bbox: [cx * SHARD, cy * SHARD, (cx + 1) * SHARD, (cy + 1) * SHARD], count: recs.length });
}
writeFileSync(join(outdir, "index.json"), JSON.stringify({
  shard: SHARD, crs: "EPSG:4326",
  fields: ["lon", "lat", "color_potencia", "color_energia", "capacidad_kva", "municipio", "subestacion", "nivel_creg"],
  legend: { V: "VERDE", A: "AMARILLO", N: "NARANJA", R: "ROJO", "?": "sin dato" },
  source: "EPM ETER, servicio publico CREG030/Semaforo_Transformador capa 0",
  retrievedAt: "2026-10-14", coverage: "Red de EPM (Antioquia y zonas aledanas)",
  count: cells.reduce((s, c) => s + c.count, 0), cells,
}));
console.log("shards:", cells.length, "transformadores:", cells.reduce((s, c) => s + c.count, 0));
