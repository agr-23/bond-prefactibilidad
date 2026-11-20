"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import type { LandingContent } from "../../content/landing";

export default function Nav({ nav }: { nav: LandingContent["nav"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    // El menú móvil se cierra si la ventana pasa a escritorio.
    const desktop = window.matchMedia("(min-width: 80rem)");
    const onDesktop = () => desktop.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return (
    <header className="lx-deep lx-nav text-ink" data-scrolled={scrolled || open ? "" : undefined}>
      <nav aria-label={nav.ariaLabel}>
        <div className="lx-container lx-nav-bar">
          <a className="lx-brand" href="#inicio" aria-label={nav.homeLabel}>
            <img className="lx-brand-logo" src="/brand/map-dot-blanco.svg" alt="map.dot" width={110} height={39} />
          </a>
          <ul className="lx-nav-links">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
          <div className="lx-nav-actions">
            <a className="lx-nav-platform" href={nav.platform.href}>
              {nav.platform.label}
            </a>
            <a className="lx-btn lx-btn--small" href={nav.cta.href}>
              {nav.cta.label}
            </a>
            <button
              ref={toggleRef}
              type="button"
              className="lx-nav-toggle"
              aria-expanded={open}
              aria-controls="lx-menu"
              aria-label={open ? nav.closeMenu : nav.openMenu}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div id="lx-menu" className="lx-menu" hidden={!open}>
          <ul className="lx-container">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href={nav.platform.href}>{nav.platform.label}</a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
