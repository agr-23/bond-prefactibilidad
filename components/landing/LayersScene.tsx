"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Respaldo por IntersectionObserver de la escena de capas. Con soporte de
 * animation-timeline el movimiento lo lleva CSS; sin él, esta pieza marca la
 * fase según la zona que ocupa el centro de la pantalla:
 * 0 = láminas juntas, 1 = separadas con sus etiquetas, 3 = unidas de nuevo.
 * Las zonas son altas para que el cruce se detecte aunque el scroll dé saltos.
 */
export default function LayersScene({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layers = ref.current?.querySelector<HTMLElement>(".lx-layers");
    if (!layers) return;
    const zones = Array.from(layers.querySelectorAll<HTMLElement>("[data-phase-at]"));

    const update = () => {
      const middle = window.innerHeight / 2;
      let phase = 0;
      for (const zone of zones) {
        if (zone.getBoundingClientRect().top <= middle) phase = Math.max(phase, Number(zone.dataset.phaseAt));
      }
      layers.dataset.phase = String(phase);
    };

    update();
    layers.setAttribute("data-armed", "");
    const observer = new IntersectionObserver(update, { rootMargin: "-50% 0px -50% 0px" });
    zones.forEach((zone) => observer.observe(zone));
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
