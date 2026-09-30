"use client";

import { useEffect, useRef, type ReactNode } from "react";

const DURATION = 900;

function format(value: number, decimals: number) {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

/**
 * Escena de la decisión: cada tarjeta aparece con escala suave al entrar en
 * pantalla y los números del ejemplo cuentan hacia arriba. Con movimiento
 * reducido, o si ya está a la vista al cargar, se muestra el estado final.
 */
export default function DecisionScene({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-scene-item]"));
    const pending = items.filter((item) => item.getBoundingClientRect().top > window.innerHeight * 0.9);
    if (!pending.length) return;

    const frames = new Set<number>();
    const countUp = (item: HTMLElement) => {
      const counters = Array.from(item.querySelectorAll<HTMLElement>("[data-count-to]"));
      if (!counters.length) return;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        const eased = 1 - (1 - t) ** 3;
        for (const counter of counters) {
          counter.textContent = format(Number(counter.dataset.countTo) * eased, Number(counter.dataset.decimals));
        }
        if (t < 1) frames.add(requestAnimationFrame(tick));
      };
      frames.add(requestAnimationFrame(tick));
    };

    for (const item of pending) {
      item.querySelectorAll<HTMLElement>("[data-count-to]").forEach((counter) => {
        counter.textContent = format(0, Number(counter.dataset.decimals));
      });
      item.setAttribute("data-armed", "");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const item = entry.target as HTMLElement;
          observer.unobserve(item);
          item.setAttribute("data-in", "");
          countUp(item);
        }
      },
      { threshold: 0.3 },
    );
    pending.forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      frames.forEach((frame) => cancelAnimationFrame(frame));
    };
  }, []);

  return (
    <div ref={ref} className="lx-decision-scene">
      {children}
    </div>
  );
}
