/**
 * Validación del formulario de contacto de la landing, compartida por el
 * cliente (components/landing/ContactForm.tsx) y el servidor
 * (app/api/contacto/route.ts). Devuelve códigos; los textos viven en
 * content/landing.ts.
 */

export const CONTACT_LIMITS = {
  name: { min: 2, max: 120 },
  organization: { min: 2, max: 160 },
  email: { max: 254 },
  location: { max: 160 },
  message: { min: 10, max: 2000 },
} as const;

/** Tamaño máximo del cuerpo de la solicitud, en caracteres. */
export const CONTACT_MAX_BODY = 16_000;

export type ContactField =
  | "name"
  | "organization"
  | "email"
  | "role"
  | "technology"
  | "location"
  | "message"
  | "consent";

export const CONTACT_FIELDS: ContactField[] = [
  "name",
  "organization",
  "email",
  "role",
  "technology",
  "location",
  "message",
  "consent",
];

export type ContactErrorCode = "required" | "email" | "option" | "consent" | "tooShort" | "tooLong";

export interface ContactError {
  code: ContactErrorCode;
  limit?: number;
}

export type ContactErrors = Partial<Record<ContactField, ContactError>>;

export interface ContactInput {
  name: string;
  organization: string;
  email: string;
  role: string;
  technology: string;
  location: string;
  message: string;
  consent: boolean;
  /** Campo trampa: las personas no lo ven; si llega con texto, es un bot. */
  website: string;
}

export interface ContactOptions {
  roles: readonly string[];
  technologies: readonly string[];
}

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readText(raw: Record<string, unknown>, key: string, multiline = false) {
  const value = raw[key];
  if (typeof value !== "string") return "";
  const clean = value.replace(CONTROL_CHARACTERS, "");
  return multiline ? clean.replace(/\r\n?/g, "\n").trim() : clean.replace(/\s+/g, " ").trim();
}

export function normalizeContact(raw: Record<string, unknown>): ContactInput {
  const consent = raw.consent;
  return {
    name: readText(raw, "name"),
    organization: readText(raw, "organization"),
    email: readText(raw, "email"),
    role: readText(raw, "role"),
    technology: readText(raw, "technology"),
    location: readText(raw, "location"),
    message: readText(raw, "message", true),
    consent: consent === true || consent === "on" || consent === "true",
    website: readText(raw, "website"),
  };
}

export function validateContact(input: ContactInput, options: ContactOptions): ContactErrors {
  const errors: ContactErrors = {};
  const text = (field: "name" | "organization" | "message", value: string) => {
    const { min, max } = CONTACT_LIMITS[field];
    if (!value) errors[field] = { code: "required" };
    else if (value.length < min) errors[field] = { code: "tooShort", limit: min };
    else if (value.length > max) errors[field] = { code: "tooLong", limit: max };
  };

  text("name", input.name);
  text("organization", input.organization);

  if (!input.email) errors.email = { code: "required" };
  else if (input.email.length > CONTACT_LIMITS.email.max) errors.email = { code: "tooLong", limit: CONTACT_LIMITS.email.max };
  else if (!EMAIL.test(input.email)) errors.email = { code: "email" };

  if (!input.role) errors.role = { code: "required" };
  else if (!options.roles.includes(input.role)) errors.role = { code: "option" };

  if (!input.technology) errors.technology = { code: "required" };
  else if (!options.technologies.includes(input.technology)) errors.technology = { code: "option" };

  if (input.location.length > CONTACT_LIMITS.location.max) {
    errors.location = { code: "tooLong", limit: CONTACT_LIMITS.location.max };
  }

  text("message", input.message);

  if (!input.consent) errors.consent = { code: "consent" };

  return errors;
}

/** Convierte los códigos en mensajes con los textos del contenido. */
export function contactMessages(errors: ContactErrors, copy: Record<ContactErrorCode, string>) {
  const messages: Partial<Record<ContactField, string>> = {};
  for (const field of CONTACT_FIELDS) {
    const error = errors[field];
    if (error) messages[field] = copy[error.code].replace("{n}", String(error.limit ?? ""));
  }
  return messages;
}
