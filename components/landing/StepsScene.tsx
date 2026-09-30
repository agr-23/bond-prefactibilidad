"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Estado del escenario en cada paso de "Cómo funciona". */
const FLAGS_BY_STEP: string[][] = [
  [],
  ["trace"],
  ["trace", "tilt", "inputs"],
  ["trace", "tilt", "layers"],
  ["trace", "tilt", "layers", "compress", "index"],
  ["trace", "tilt", "layers", "compress", "result"],
];
const ALL_FLAGS = ["trace", "tilt", "inputs", "layers", "compress", "index", "result"];

/**
 * Controlador de la escena fija: marca el paso cuyo texto cruza el centro de la
 * pantalla y traduce ese paso a atributos del escenario. Las transiciones viven
 * en CSS. Sin JavaScript, el escenario queda en su estado final.
 */
export default function StepsScene({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const stage = root?.querySelector<HTMLElement>(".lx-stage--live");
    if (!root || !stage) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-step-index]"));

    const show = (step: number) => {
      const flags = FLAGS_BY_STEP[step] ?? [];
      for (const flag of ALL_FLAGS) stage.toggleAttribute(`data-${flag}`, flags.includes(flag));
      for (const item of steps) item.toggleAttribute("data-active", Number(item.dataset.stepIndex) === step);
    };

    // La escena arranca vacía y se construye a medida que se lee.
    show(0);
    root.setAttribute("data-armed", "");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) show(Number((entry.target as HTMLElement).dataset.stepIndex));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    steps.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="lx-scene">
      {children}
    </div>
  );
}
