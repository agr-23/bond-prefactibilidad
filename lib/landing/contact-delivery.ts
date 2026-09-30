/**
 * Destino de las solicitudes del formulario de contacto (solo servidor).
 *
 * Seguro por defecto: sin destino configurado, el endpoint nunca responde
 * éxito y la landing lo dice. Variables de entorno:
 *   CONTACT_DESTINATION        URL https de un webhook (CRM, automatización o
 *                              correo transaccional) que recibe cada solicitud
 *                              como JSON por POST. http solo se acepta para
 *                              localhost, en pruebas.
 *   CONTACT_DESTINATION_TOKEN  Opcional. Se envía como "Authorization: Bearer …".
 * La solicitud cuenta como entregada solo si el destino responde 2xx.
 */
import type { ContactInput } from "./contact";

export interface ContactDestination {
  url: URL;
  token?: string;
}

type Env = Record<string, string | undefined>;

export function contactDestination(env: Env = process.env): ContactDestination | null {
  const raw = env.CONTACT_DESTINATION?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
  const token = env.CONTACT_DESTINATION_TOKEN?.trim();
  return token ? { url, token } : { url };
}

/** Reenvía la solicitud validada. Devuelve true solo si el destino la aceptó. */
export async function deliverContact(destination: ContactDestination, input: ContactInput): Promise<boolean> {
  // Solo los campos del formulario: el campo trampa no se reenvía.
  const fields = {
    name: input.name,
    organization: input.organization,
    email: input.email,
    role: input.role,
    technology: input.technology,
    location: input.location,
    message: input.message,
    consent: input.consent,
  };
  try {
    const response = await fetch(destination.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(destination.token ? { Authorization: `Bearer ${destination.token}` } : {}),
      },
      body: JSON.stringify({ source: "bond-landing", receivedAt: new Date().toISOString(), ...fields }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
