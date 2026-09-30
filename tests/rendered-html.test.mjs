import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import test from "node:test";

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

let worker;

async function page(path) {
  if (!worker) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    ({ default: worker } = await import(workerUrl.href));
  }
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  return { status: response.status, type: response.headers.get("content-type") ?? "", html: await response.text() };
}

// Prueba de humo: el build de producción renderiza las rutas de la herramienta.
for (const path of ["/", "/legacy"]) {
  test(`el build renderiza ${path}`, async () => {
    const { status, type, html } = await page(path);
    assert.equal(status, 200);
    assert.match(type, /^text\/html\b/i);
    assert.match(html, /<html lang="es/);
    assert.match(html, /<title>[^<]*BOND[^<]*<\/title>/);
  });
}
