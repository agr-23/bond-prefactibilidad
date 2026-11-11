// Genera public/data/sin-subestaciones.json a partir del tablero público de la UPME
// (capacidad de conexión al SIN 2026-2027) y las subestaciones de OpenStreetMap.
// La UPME no publica coordenadas, así que cada barra se ubica cruzando su nombre
// (y nivel de tensión) con las subestaciones de OSM. Cruce conservador: coincidencia
// exacta de nombre, o parcial solo si el nivel de tensión coincide y apunta a un
// único lugar. Las que no casan se quedan por fuera (en BOND salen como "Sin dato").
// Uso: node scripts/generar-sin-subestaciones.mjs  (requiere red: UPME + Overpass)
import { writeFileSync } from "node:fs";
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const UA = "BOND-prefactibilidad/1.0";
const upmeHtml = await (await fetch("https://app.upme.gov.co/Tablero_Capacidad_Barra_26_27/Tablero_Capacidad_Barra_26_27.html", { headers: { "User-Agent": UA } })).text();
const bd = JSON.parse(upmeHtml.match(/const bd\s*=\s*(\{[\s\S]*?\});/)[1]);
const oql = '[out:json][timeout:90];area["ISO3166-1"="CO"][admin_level=2]->.co;(node["power"="substation"](area.co);way["power"="substation"](area.co););out tags center;';
const osm = (await (await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(oql) })).json()).elements;
const items = [];
for (const e of osm) {
  const nm = e.tags?.name; if (!nm) continue;
  const lat = e.type === "node" ? e.lat : e.center?.lat, lon = e.type === "node" ? e.lon : e.center?.lon;
  if (lat == null) continue;
  const kvs = [...String(e.tags.voltage ?? "").matchAll(/\d{4,6}/g)].map((m) => Math.round(+m[0] / 1000));
  items.push([norm(nm), lat, lon, kvs]);
}
const rows = [];
for (const [name, v] of Object.entries(bd)) {
  const m = name.match(/(\d{2,3})\s*(\(.*\))?\s*$/); const kv = m ? +m[1] : null;
  const base = norm(name.replace(/\(.*?\)/g, "").replace(/\d{2,3}\s*(\(.*\))?\s*$/, ""));
  if (!base) continue;
  let cands = items.filter((c) => c[0] === base);
  if (cands.length && kv) { const vm = cands.filter((c) => c[3].includes(kv)); if (vm.length) cands = vm; }
  if (!cands.length) {
    let contains = items.filter((c) => (c[0].includes(base) || base.includes(c[0])) && c[0].length >= 4);
    if (kv) contains = contains.filter((c) => c[3].includes(kv));
    const locs = new Set(contains.map((c) => `${c[1].toFixed(2)},${c[2].toFixed(2)}`));
    if (locs.size === 1) cands = contains;
  }
  if (!cands.length) continue;
  const b = cands[0], i = v["Año"].indexOf("2027"), j = v["Año"].indexOf("2026");
  rows.push([name, +b[1].toFixed(6), +b[2].toFixed(6), kv, v.P95[j], v.P95[i], v.P100[j], v.P100[i]]);
}
writeFileSync("public/data/sin-subestaciones.json", JSON.stringify({
  fields: ["name", "lat", "lon", "kv", "p95_2026", "p95_2027", "p100_2026", "p100_2027"],
  source: "UPME, tablero de capacidad de conexion al SIN 2026-2027 (valores indicativos). Ubicacion de subestaciones por cruce de nombre con OpenStreetMap.",
  retrievedAt: new Date().toISOString().slice(0, 10), count: rows.length,
  coverage: `${rows.length} de ${Object.keys(bd).length} barras del tablero ubicadas; el resto no se pudo geolocalizar.`,
  substations: rows,
}));
console.log("subestaciones ubicadas:", rows.length, "de", Object.keys(bd).length);
