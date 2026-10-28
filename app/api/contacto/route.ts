import { landing } from "../../../content/landing";
import { CONTACT_MAX_BODY, contactMessages, normalizeContact, validateContact } from "../../../lib/landing/contact";
import { contactDestination, deliverContact } from "../../../lib/landing/contact-delivery";

export const dynamic = "force-dynamic";

const { form } = landing.contact;
const options = { roles: form.role.options, technologies: form.technology.options };

type Outcome = "enviado" | "revisar" | "sin-destino" | "error";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Respuesta para envíos sin JavaScript: vuelve a la landing con el resultado. */
const backToForm = (request: Request, outcome: Outcome) =>
  new Response(null, {
    status: 303,
    headers: { Location: new URL(`/?contacto=${outcome}#contacto`, request.url).toString(), "Cache-Control": "no-store" },
  });

async function readBody(request: Request, type: string) {
  const text = await request.text();
  if (text.length > CONTACT_MAX_BODY) return { tooLarge: true as const };
  if (type.includes("application/json")) {
    try {
      const value: unknown = JSON.parse(text);
      return value && typeof value === "object" && !Array.isArray(value) ? { raw: value as Record<string, unknown> } : {};
    } catch {
      return {};
    }
  }
  return { raw: Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown> };
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "origin" }, 403);

  const type = request.headers.get("content-type") ?? "";
  const isJson = type.includes("application/json");
  if (!isJson && !type.includes("application/x-www-form-urlencoded")) return json({ ok: false, error: "unsupported" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > CONTACT_MAX_BODY) return json({ ok: false, error: "too_large" }, 413);

  // Seguro por defecto: sin destino configurado nunca se responde éxito.
  const destination = contactDestination();
  if (!destination) {
    return isJson ? json({ ok: false, error: "not_configured" }, 503) : backToForm(request, "sin-destino");
  }

  const body = await readBody(request, type);
  if ("tooLarge" in body) return json({ ok: false, error: "too_large" }, 413);
  if (!body.raw) return json({ ok: false, error: "invalid_body" }, 400);

  const input = normalizeContact(body.raw);
  // Campo trampa con contenido: se responde como si todo fuera bien y se descarta.
  if (input.website) return isJson ? json({ ok: true }) : backToForm(request, "enviado");

  const errors = validateContact(input, options);
  if (Object.keys(errors).length) {
    return isJson
      ? json({ ok: false, error: "validation", fields: contactMessages(errors, form.errors) }, 422)
      : backToForm(request, "revisar");
  }

  // La solicitud solo se da por recibida si el destino la aceptó (respuesta 2xx).
  if (!(await deliverContact(destination, input))) {
    return isJson ? json({ ok: false, error: "delivery_failed" }, 502) : backToForm(request, "error");
  }
  return isJson ? json({ ok: true }) : backToForm(request, "enviado");
}
