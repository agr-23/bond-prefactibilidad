"use client";

// vinext agrupa en una sola hoja el CSS importado desde server components.
// Importarlo desde un client component lo limita a las rutas que lo usan,
// así la landing no descarga los estilos de maplibre.
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapLibreStyles() {
  return null;
}
