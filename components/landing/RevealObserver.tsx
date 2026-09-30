"use client";

import { useEffect } from "react";

/**
 * Respaldo de las apariciones al hacer scroll. Donde el navegador soporta
 * animation-timeline: view(), CSS se encarga y esta pieza no hace nada.
 * El contenido es visible por defecto: solo se oculta lo que aún no entra en
 * pantalla, después de marcar como visible lo que ya está a la vista.
 */
export default function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()")) return;
    const root = document.querySelector<HTMLElement>(".lx-root");
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    for (const item of items) {
      const { top, bottom } = item.getBoundingClientRect();
      if (top < window.innerHeight && bottom > 0) item.setAttribute("data-revealed", "");
    }
    root.classList.add("lx-io");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    items.filter((item) => !item.hasAttribute("data-revealed")).forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return null;
}
