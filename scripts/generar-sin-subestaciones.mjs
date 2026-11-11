// Genera public/data/sin-subestaciones.json a partir del tablero público de la UPME
// (capacidad de conexión al SIN 2026-2027) y las subestaciones de OpenStreetMap.
// La UPME no publica coordenadas, así que cada barra se ubica cruzando su nombre
// con las subestaciones de OSM, por tokens (palabras) y nivel de tensión.
//
// Cruce conservador para no poner coordenadas equivocadas:
//   - Se limpian los nombres: se quitan "Subestación", "eléctrica", "kV", la tensión
//     y los nombres de empresa (EPM, ISA, ENEL...). Quedan los tokens del nombre propio.
//   - Coincide si los tokens de la UPME están en los de OSM (igualdad o subconjunto).
//   - Se desempata por tensión. Si hay varios candidatos a menos de 12 km, es la misma
//     subestación y se usa el centroide; si están en regiones distintas, se descarta
//     (queda como "Sin dato" en BOND) para no adivinar entre dos lugares homónimos.
//
// Uso: node scripts/generar-sin-subestaciones.mjs  (requiere red: UPME + Overpass)
import { writeFileSync } from "node:fs";

const UA = "BOND-prefactibilidad/1.0";
const DROP = new Set(["SUBESTACION", "ELECTRICA", "SE", "KV", "DE", "DEL", "LA", "EL", "LOS", "LAS",
  "EPM", "ISA", "EEB", "EBSA", "ENEL", "EMGESA", "CELSIA", "GECELCA", "EPSA", "CENS", "ESSA", "CHEC",
  "EDEQ", "EMCALI", "TRANSELCA", "DISPAC", "AIRE", "AFINIA", "EEC", "CEO", "CEDENAR", "ELECTROHUILA",
  "ENERTOLIMA", "EMSA", "ENERCA", "GEB"]);
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const toks = (s) => fold(s).replace(/[^A-Z0-9]/g, " ").split(/\s+/).filter((w) => w && !DROP.has(w) && !/^\d{1,3}$/.test(w));
const kvof = (s) => { const m = String(s).match(/(\d{2,3})\s*(kv)?\s*(\(.*\))?\s*$/i); return m ? +m[1] : null; };
const dkm = (a, b) => { const R = 6371, r = (x) => x * Math.PI / 180; return 2 * R * Math.asin(Math.sqrt(Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2)); };
const subset = (a, b) => [...a].every((x) => b.has(x));

const upmeHtml = await (await fetch("https://app.upme.gov.co/Tablero_Capacidad_Barra_26_27/Tablero_Capacidad_Barra_26_27.html", { headers: { "User-Agent": UA } })).text();
const bd = JSON.parse(upmeHtml.match(/const bd\s*=\s*(\{[\s\S]*?\});/)[1]);
const oql = '[out:json][timeout:90];area["ISO3166-1"="CO"][admin_level=2]->.co;(node["power"="substation"](area.co);way["power"="substation"](area.co););out tags center;';
const osm = (await (await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(oql) })).json()).elements;

const items = [];
for (const e of osm) {
  const nm = e.tags?.name; if (!nm) continue;
  const lat = e.type === "node" ? e.lat : e.center?.lat, lon = e.type === "node" ? e.lon : e.center?.lon;
  if (lat == null) continue;
  const tk = toks(nm); if (!tk.length) continue;
  const kvs = new Set([...String(e.tags.voltage ?? "").matchAll(/\d{4,6}/g)].map((m) => Math.round(+m[0] / 1000)));
  if (kvof(nm)) kvs.add(kvof(nm));
  items.push({ lat, lon, kvs, tset: new Set(tk), base: tk.join("") });
}

function resolve(cands) {
  if (!cands.length) return null;
  const near = cands.filter((c) => dkm([cands[0].lat, cands[0].lon], [c.lat, c.lon]) < 12);
  if (near.length !== cands.length) return null; // candidatos en regiones distintas: ambiguo
  return [cands.reduce((s, c) => s + c.lat, 0) / cands.length, cands.reduce((s, c) => s + c.lon, 0) / cands.length];
}

const rows = [];
for (const [name, v] of Object.entries(bd)) {
  const tk = toks(name), base = tk.join(""), tset = new Set(tk.filter((w) => w.length >= 3)), kv = kvof(name);
  if (!base || !tset.size) continue;
  let cands = items.filter((c) => c.base === base);
  if (!cands.length) cands = items.filter((c) => subset(tset, c.tset));
  if (cands.length && kv) { const vm = cands.filter((c) => !c.kvs.size || c.kvs.has(kv)); if (vm.length) cands = vm; }
  const loc = resolve(cands);
  if (!loc) continue;
  const i = v["Año"].indexOf("2027"), j = v["Año"].indexOf("2026");
  rows.push([name, +loc[0].toFixed(6), +loc[1].toFixed(6), kv, v.P95[j], v.P95[i], v.P100[j], v.P100[i]]);
}

writeFileSync("public/data/sin-subestaciones.json", JSON.stringify({
  fields: ["name", "lat", "lon", "kv", "p95_2026", "p95_2027", "p100_2026", "p100_2027"],
  source: "UPME, tablero de capacidad de conexion al SIN 2026-2027 (valores indicativos). Ubicacion de subestaciones por cruce de nombre, tokens y tension con OpenStreetMap.",
  retrievedAt: new Date().toISOString().slice(0, 10), count: rows.length,
  coverage: `${rows.length} de ${Object.keys(bd).length} barras del tablero ubicadas; el resto no se pudo geolocalizar de forma confiable.`,
  substations: rows,
}));
console.log("subestaciones ubicadas:", rows.length, "de", Object.keys(bd).length);
