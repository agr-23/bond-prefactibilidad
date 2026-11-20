import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import * as nodeModule from "node:module";
import test from "node:test";
import { gzipSync } from "node:zlib";

// El worker importa `cloudflare:workers`, que solo existe en workerd. Para
// renderizar el build en Node se sustituye por un módulo vacío: las rutas que
// se prueban aquí no usan los bindings de D1 ni R2.
const workersStub = "data:text/javascript,export const env={};export default {};";
if (nodeModule.registerHooks) {
  nodeModule.registerHooks({
    resolve: (specifier, context, next) =>
      specifier === "cloudflare:workers" ? { url: workersStub, shortCircuit: true } : next(specifier, context),
  });
} else {
  // Node 22.13 y 22.14 no tienen registerHooks.
  nodeModule.register(
    `data:text/javascript,export async function resolve(s,c,n){return s==="cloudflare:workers"?{url:${JSON.stringify(workersStub)},shortCircuit:true}:n(s,c)}`,
  );
}

const clientRoot = new URL("../dist/client/", import.meta.url);
let worker;

async function request(path, init = {}) {
  if (!worker) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    ({ default: worker } = await import(workerUrl.href));
  }
  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function page(path) {
  const response = await request(path, { headers: { accept: "text/html" } });
  return { status: response.status, type: response.headers.get("content-type") ?? "", html: await response.text() };
}

const count = (text, pattern) => (text.match(pattern) ?? []).length;

/** Fuentes precargadas por una página (<link rel="preload" as="font">). */
const fontPreloads = (html) =>
  [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map((match) => match[1]);

/** Separa por comas fuera de paréntesis: "a calc(1, 2), b" → ["a calc(1, 2)", "b"]. */
function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  return [...parts, current];
}

/** Archivos JS y CSS que carga una página: enlaces del HTML más importaciones estáticas. */
async function assetClosure(html) {
  const seen = new Set();
  const queue = [...new Set(html.match(/\/assets\/[^"'\s)]+\.(?:js|css)/g) ?? [])];
  while (queue.length) {
    const asset = queue.shift();
    if (seen.has(asset)) continue;
    seen.add(asset);
    if (asset.endsWith(".js")) {
      const source = await readFile(new URL(`.${asset}`, clientRoot), "utf8");
      for (const match of source.matchAll(/(?:import|from)\s*["']\.\/([^"']+\.js)["']/g)) queue.push(`/assets/${match[1]}`);
    }
  }
  return [...seen];
}

test("la landing se renderiza en / con su metadata", async () => {
  const { status, type, html } = await page("/");
  assert.equal(status, 200);
  assert.match(type, /^text\/html\b/i);
  assert.match(html, /<html lang="es-CO"/);
  assert.match(html, /<title>dot. \| Prefactibilidad territorial energética en Colombia<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{80,}"/);
  assert.match(html, /<meta property="og:locale" content="es_CO"/);
  assert.match(html, /<meta property="og:title" content="[^"]+"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/[^"]+\/"/);
  assert.equal(count(html, /<h1[\s>]/g), 1);

  const jsonLd = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert.ok(jsonLd, "falta el JSON-LD");
  assert.equal(JSON.parse(jsonLd[1])["@type"], "Organization");

  for (const id of [
    "inicio",
    "problema",
    "como-funciona",
    "que-evaluamos",
    "decision",
    "tecnologias",
    "colombia",
    "entregables",
    "para-quien",
    "transparencia",
    "preguntas",
    "contacto",
  ]) {
    assert.match(html, new RegExp(`<section id="${id}"`), `falta la sección #${id}`);
  }
  assert.ok(count(html, /<h2[\s>]/g) >= 11);
  assert.match(html, /href="\/plataforma"/);
  assert.match(html, /href="#contacto"/);
});

test("el copy respeta las reglas de honestidad", async () => {
  const { html } = await page("/");
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");

  assert.match(text, /Ejemplo ilustrativo de una prueba interna/);
  for (const figure of ["80,25", "12,71", "7,04"]) assert.match(text, new RegExp(figure));
  for (const label of ["En el índice", "Dato de contexto", "Próximamente", "Disponible", "En desarrollo"]) {
    assert.match(text, new RegExp(label), `falta la etiqueta ${label}`);
  }
  assert.match(text, /Emisión automática de la decisión/);

  assert.doesNotMatch(text, /KMZ/);
  assert.doesNotMatch(text, /garantiza|certificad|\+\s?\d+\s+(proyectos|clientes)|IA que decide/i);
  assert.doesNotMatch(text, /Transect/i);
  // "precisión catastral" solo aparece para negarla, en "dot. no es".
  assert.equal(count(text, /precisión catastral/g), 1);
  assert.match(text, /dot. no es[\s\S]*precisión catastral/);
});

test("la landing incluye un formulario accesible con campo trampa", async () => {
  const { html } = await page("/");
  assert.match(html, /<form[^>]*action="\/api\/contacto"[^>]*method="post"/);
  for (const name of ["name", "organization", "email", "role", "technology", "location", "message", "consent"]) {
    assert.match(html, new RegExp(`name="${name}"`), `falta el campo ${name}`);
  }
  assert.match(html, /<div class="lx-honeypot" aria-hidden="true">/);
  assert.match(html, /name="website"[^>]*tabindex="-1"|tabindex="-1"[^>]*name="website"/i);
  assert.match(html, /role="status" aria-live="polite"/);
});

test("/ no carga maplibre ni código de /plataforma, dentro del presupuesto", async (t) => {
  const { html } = await page("/");
  assert.doesNotMatch(html, /MapLibreStyles|Workspace-/);
  const assets = await assetClosure(html);
  let js = 0;
  let css = 0;
  for (const asset of assets) {
    const source = await readFile(new URL(`.${asset}`, clientRoot));
    const text = source.toString("utf8");
    assert.doesNotMatch(text, asset.endsWith(".js") ? /maplibre|mapbox-gl|jsPDF|ExcelJS/ : /\.maplibregl-map\b/, `${asset} trae código de la plataforma`);
    const size = gzipSync(source).length;
    if (asset.endsWith(".js")) js += size;
    else css += size;
  }
  const fonts = fontPreloads(html);
  let fontBytes = 0;
  for (const font of fonts) fontBytes += (await readFile(new URL(`.${font}`, clientRoot))).length;
  t.diagnostic(
    `JS ${(js / 1024).toFixed(1)} KB gz · CSS ${(css / 1024).toFixed(1)} KB gz · fuentes ${fonts.length} (${(fontBytes / 1024).toFixed(1)} KB) · ${assets.length} archivos`,
  );
  assert.ok(js < 110 * 1024, `JS de / demasiado grande: ${js} bytes gz`);
  assert.ok(css < 30 * 1024, `CSS de / demasiado grande: ${css} bytes gz`);
  assert.equal(fonts.length, 1, `/ precarga ${fonts.length} fuentes`);
  assert.ok(fontBytes < 30 * 1024, `fuentes de / demasiado grandes: ${fontBytes} bytes`);
});

test("/plataforma renderiza la herramienta con sus estilos de mapa", async () => {
  const { status, html } = await page("/plataforma");
  assert.equal(status, 200);
  assert.match(html, /<title>Plataforma \| dot.<\/title>/);
  assert.match(html, /class="studio"/);
  assert.match(html, /Explorador territorial/);
  assert.match(html, /MapLibreStyles-[^"]+\.css/);
  assert.match(html, /<a class="studio-brand" href="\/plataforma">/);
  assert.deepEqual(fontPreloads(html).length, 1, "/plataforma solo precarga Geist");
  const workspace = await readFile(new URL("../app/studio/Workspace.tsx", import.meta.url), "utf8");
  assert.match(workspace, /return_to=\/plataforma/);
  assert.doesNotMatch(workspace, /return_to=\/"/);
});

test("/legacy sigue respondiendo con la aplicación anterior", async () => {
  const { status, html } = await page("/legacy");
  assert.equal(status, 200);
  assert.match(html, /bond-app/);
  assert.match(html, /MapLibreStyles-[^"]+\.css/);
});

const validContact = {
  name: "Ana Pérez",
  organization: "Solar Andes SAS",
  email: "ana@solarandes.co",
  role: "Desarrollador de proyectos",
  technology: "Solar FV",
  location: "Caucasia, Antioquia",
  message: "Queremos evaluar un terreno antes de negociar.",
  consent: true,
  website: "",
};

const postContact = (body, headers = {}) =>
  request("/api/contacto", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const postContactForm = (fields) =>
  request("/api/contacto", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });

/** Texto visible de la región de estado del formulario. */
const formStatus = (html) => (html.match(/<p class="lx-form-status"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "").replace(/<[^>]+>/g, "");

/** Webhook local que registra lo que recibe: /ok responde 204 y /falla 500. */
async function withDestination(run) {
  const received = [];
  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      received.push({ path: req.url, headers: req.headers, body: data ? JSON.parse(data) : null });
      res.writeHead(req.url === "/ok" ? 204 : 500).end();
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}`, received);
  } finally {
    delete process.env.CONTACT_DESTINATION;
    delete process.env.CONTACT_DESTINATION_TOKEN;
    await new Promise((resolve) => server.close(resolve));
  }
}

test("sin CONTACT_DESTINATION, el formulario nunca responde éxito", async () => {
  delete process.env.CONTACT_DESTINATION;

  let response = await postContact(validContact);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "not_configured" });

  response = await postContact({ ...validContact, website: "https://spam.example" });
  assert.equal(response.status, 503, "sin destino no hay éxito, ni siquiera para el campo trampa");

  response = await postContactForm({ ...validContact, consent: "on" });
  assert.equal(response.status, 303);
  assert.match(response.headers.get("location") ?? "", /\/\?contacto=sin-destino#contacto$/);

  // Un destino que no es https (fuera de localhost) no cuenta como configurado.
  process.env.CONTACT_DESTINATION = "http://ejemplo.example/webhook";
  response = await postContact(validContact);
  assert.equal(response.status, 503);
  delete process.env.CONTACT_DESTINATION;

  // La landing lo advierte con un enlace de correo, antes y después de intentar enviar.
  const { html } = await page("/");
  assert.match(html, /<p class="lx-form-notice">[^<]*no está conectado[\s\S]*?href="mailto:[^"]+"/);
  const status = formStatus((await page("/?contacto=sin-destino")).html);
  assert.match(status, /no se envió/);
  assert.doesNotMatch(status, /Le escribiremos|Solicitud enviada/);
  assert.match((await page("/?contacto=sin-destino")).html, /class="lx-form-status"[^>]*>[\s\S]*?href="mailto:/);
});

test("con destino configurado, /api/contacto valida y reenvía la solicitud", async () => {
  await withDestination(async (base, received) => {
    process.env.CONTACT_DESTINATION = `${base}/ok`;
    process.env.CONTACT_DESTINATION_TOKEN = "token-de-prueba";

    let response = await postContact(validContact);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(received.length, 1);
    assert.equal(received[0].headers.authorization, "Bearer token-de-prueba");
    assert.equal(received[0].body.source, "bond-landing");
    assert.equal(received[0].body.email, validContact.email);
    assert.equal(received[0].body.consent, true);
    assert.equal("website" in received[0].body, false, "el campo trampa no se reenvía");

    response = await postContact({ ...validContact, name: "A", email: "sin-arroba", role: "Otro rol", consent: false });
    assert.equal(response.status, 422);
    const invalid = await response.json();
    assert.deepEqual(Object.keys(invalid.fields).sort(), ["consent", "email", "name", "role"]);
    assert.match(invalid.fields.email, /correo válido/);

    response = await postContact({ ...validContact, website: "https://spam.example" });
    assert.equal(response.status, 200, "el campo trampa se descarta sin avisar");
    assert.equal(received.length, 1, "ni los inválidos ni el campo trampa se reenvían");

    assert.equal((await postContact({ message: "x".repeat(20_000) })).status, 413);
    assert.equal((await postContact(validContact, { origin: "https://otro-sitio.example" })).status, 403);
    assert.equal((await postContact("{roto")).status, 400);
    response = await request("/api/contacto", { method: "POST", headers: { "content-type": "text/plain" }, body: "hola" });
    assert.equal(response.status, 415);

    response = await postContactForm({ ...validContact, consent: "on" });
    assert.equal(response.status, 303);
    assert.match(response.headers.get("location") ?? "", /\/\?contacto=enviado#contacto$/);
    assert.equal(received.length, 2);

    // Con destino, la landing no muestra el aviso de formulario desconectado.
    assert.doesNotMatch((await page("/")).html, /class="lx-form-notice"/);

    // Si el destino no confirma la entrega, no hay éxito.
    process.env.CONTACT_DESTINATION = `${base}/falla`;
    response = await postContact(validContact);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok: false, error: "delivery_failed" });
    response = await postContactForm({ ...validContact, consent: "on" });
    assert.match(response.headers.get("location") ?? "", /\/\?contacto=error#contacto$/);
    assert.doesNotMatch(formStatus((await page("/?contacto=error")).html), /Le escribiremos|Solicitud enviada/);
  });
});

test("los estilos animan solo propiedades compuestas y respetan el movimiento reducido", async () => {
  const css = await readFile(new URL("../components/landing/landing.css", import.meta.url), "utf8");
  const allowed = new Set(["opacity", "transform", "stroke-dashoffset"]);

  for (const [, name, body] of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
    for (const [, property] of body.matchAll(/([a-z-]+)\s*:/g)) {
      assert.ok(allowed.has(property), `@keyframes ${name} anima ${property}`);
    }
  }
  for (const [, value] of css.matchAll(/transition:\s*([^;]+);/g)) {
    for (const part of splitTopLevel(value)) {
      const property = part.trim().split(/\s+/)[0];
      assert.ok(allowed.has(property) || property === "none", `transición sobre ${property}`);
    }
  }
  // lightningcss descarta `translate` si la misma regla tiene `transform`.
  for (const [, block] of css.matchAll(/\{([^{}]*)\}/g)) {
    assert.ok(!(/(^|\s)translate:/.test(block) && /(^|\s)transform:/.test(block)), `regla con translate y transform: ${block.trim().slice(0, 80)}`);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
  assert.match(css, /@supports \(animation-timeline: view\(\)\)/);
  assert.match(css, /@supports not \(animation-timeline: view\(\)\)/);

  const assets = await readdir(new URL("assets/", clientRoot));
  assert.ok(assets.some((file) => file.startsWith("LandingStyles-") && file.endsWith(".css")));
});
