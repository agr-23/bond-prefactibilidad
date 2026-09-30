"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { LandingContent } from "../../content/landing";
import {
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  contactMessages,
  normalizeContact,
  validateContact,
  type ContactField,
} from "../../lib/landing/contact";

type FormCopy = LandingContent["contact"]["form"];
type Status = "idle" | "sending" | "success" | "unavailable" | "error";
type Messages = Partial<Record<ContactField, string>>;

/** Resultado de un envío sin JavaScript, leído de ?contacto= al volver a la landing. */
export type ContactOutcome = "enviado" | "revisar" | "sin-destino" | "error";

const statusFromOutcome = (outcome?: ContactOutcome): Status =>
  outcome === "enviado" ? "success" : outcome === "sin-destino" ? "unavailable" : outcome === "error" ? "error" : "idle";

function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: ContactField;
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
  children: ReactNode;
}) {
  return (
    <div className="lx-field-group" data-invalid={error ? "" : undefined}>
      <label htmlFor={`contacto-${id}`} className="lx-label">
        {label}
        {optional ? <span className="sr-only"> {optional}</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`contacto-${id}-hint`} className="lx-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`contacto-${id}-error`} className="lx-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function ContactForm({
  copy,
  email,
  connected,
  outcome,
}: {
  copy: FormCopy;
  /** Correo de contacto alternativo (mailto) cuando la solicitud no se pudo enviar. */
  email: string;
  /** Hay un destino configurado para las solicitudes (CONTACT_DESTINATION). */
  connected: boolean;
  outcome?: ContactOutcome;
}) {
  const [status, setStatus] = useState<Status>(statusFromOutcome(outcome));
  const [messages, setMessages] = useState<Messages>({});
  const [invalid, setInvalid] = useState(outcome === "revisar");
  const options = { roles: copy.role.options, technologies: copy.technology.options };
  const mailto = (
    <>
      {copy.writeUs}{" "}
      <a className="lx-inline-link" href={`mailto:${email}`}>
        {email}
      </a>
      .
    </>
  );

  const describedBy = (id: ContactField, hint?: string) =>
    [hint ? `contacto-${id}-hint` : "", messages[id] ? `contacto-${id}-error` : ""].filter(Boolean).join(" ") || undefined;

  const control = (id: ContactField, hint?: string) => ({
    id: `contacto-${id}`,
    name: id,
    "aria-invalid": messages[id] ? true : undefined,
    "aria-describedby": describedBy(id, hint),
  });

  const focusFirstInvalid = (form: HTMLFormElement, found: Messages) => {
    const first = CONTACT_FIELDS.find((field) => found[field]);
    if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const input = normalizeContact(data);
    const found = contactMessages(validateContact(input, options), copy.errors);
    setMessages(found);
    if (Object.keys(found).length) {
      setStatus("idle");
      setInvalid(true);
      focusFirstInvalid(form, found);
      return;
    }

    setStatus("sending");
    setInvalid(false);
    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body: { ok?: boolean; error?: string; fields?: Messages } | null = await response.json().catch(() => null);
      if (response.ok && body?.ok) {
        form.reset();
        setStatus("success");
        return;
      }
      if (response.status === 422 && body?.fields) {
        setMessages(body.fields);
        setStatus("idle");
        setInvalid(true);
        focusFirstInvalid(form, body.fields);
        return;
      }
      setStatus(body?.error === "not_configured" ? "unavailable" : "error");
    } catch {
      setStatus("error");
    }
  };

  const sending = status === "sending";

  return (
    <form className="lx-form" action="/api/contacto" method="post" noValidate onSubmit={submit}>
      {connected ? null : (
        <p className="lx-form-notice">
          {copy.notConnected} {mailto}
        </p>
      )}
      <div className="lx-form-grid">
        <Field id="name" label={copy.name.label} error={messages.name}>
          <input
            {...control("name")}
            className="lx-input"
            type="text"
            autoComplete="name"
            required
            maxLength={CONTACT_LIMITS.name.max}
          />
        </Field>
        <Field id="organization" label={copy.organization.label} error={messages.organization}>
          <input
            {...control("organization")}
            className="lx-input"
            type="text"
            autoComplete="organization"
            required
            maxLength={CONTACT_LIMITS.organization.max}
          />
        </Field>
        <Field id="email" label={copy.email.label} error={messages.email}>
          <input
            {...control("email")}
            className="lx-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={copy.email.placeholder}
            required
            maxLength={CONTACT_LIMITS.email.max}
          />
        </Field>
        <Field id="role" label={copy.role.label} error={messages.role}>
          <select {...control("role")} className="lx-input lx-select" required defaultValue="">
            <option value="">{copy.role.placeholder}</option>
            {copy.role.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field id="technology" label={copy.technology.label} error={messages.technology}>
          <select {...control("technology")} className="lx-input lx-select" required defaultValue="">
            <option value="">{copy.technology.placeholder}</option>
            {copy.technology.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field
          id="location"
          label={copy.location.label}
          hint={copy.location.hint}
          optional={copy.optional}
          error={messages.location}
        >
          <input
            {...control("location", copy.location.hint)}
            className="lx-input"
            type="text"
            autoComplete="address-level2"
            maxLength={CONTACT_LIMITS.location.max}
          />
        </Field>
        <div className="lx-form-wide">
          <Field id="message" label={copy.message.label} hint={copy.message.hint} error={messages.message}>
            <textarea
              {...control("message", copy.message.hint)}
              className="lx-input lx-textarea"
              rows={5}
              required
              maxLength={CONTACT_LIMITS.message.max}
            />
          </Field>
        </div>
      </div>

      <div className="lx-honeypot" aria-hidden="true">
        <label htmlFor="contacto-website">{copy.honeypot}</label>
        <input id="contacto-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="lx-consent" data-invalid={messages.consent ? "" : undefined}>
        <input
          id="contacto-consent"
          name="consent"
          type="checkbox"
          required
          aria-invalid={messages.consent ? true : undefined}
          aria-describedby={messages.consent ? "contacto-consent-error" : undefined}
        />
        <label htmlFor="contacto-consent">
          {copy.consent.label}{" "}
          <a href={copy.consent.href} className="lx-inline-link">
            {copy.consent.linkLabel}
          </a>
          .
        </label>
        {messages.consent ? (
          <p id="contacto-consent-error" className="lx-error">
            {messages.consent}
          </p>
        ) : null}
      </div>

      <div className="lx-form-footer">
        <button type="submit" className="lx-btn lx-btn--large" disabled={sending} aria-disabled={sending}>
          {sending ? copy.sending : copy.submit}
        </button>
        <p className="lx-form-status" role="status" aria-live="polite" data-status={status}>
          {status === "sending" ? copy.sending : null}
          {status === "success" ? (
            <>
              <strong>{copy.success.title}</strong> {copy.success.body}
            </>
          ) : null}
          {status === "unavailable" ? (
            <>
              {copy.notSent} {mailto}
            </>
          ) : null}
          {status === "error" ? (
            <>
              {copy.failure} {mailto}
            </>
          ) : null}
          {status === "idle" && invalid ? copy.invalid : null}
        </p>
      </div>
    </form>
  );
}
