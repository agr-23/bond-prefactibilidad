"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import {
  Download,
  Eye,
  EyeOff,
  Layers3,
  MapPin,
  Maximize2,
  MousePointer2,
  Ruler,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

export type BondMapLayer = {
  id: string;
  label: string;
  group: string;
  color: string;
  active: boolean;
};

export type BondMapSite = {
  id: string;
  name: string;
  score: number;
  decision: string;
  coordinates: [number, number];
};

export type MunicipalAreaRecord = {
  departamento: string;
  municipio: string;
  muestrasEnArea: number;
  centroideEnArea: boolean;
  energiaSolarAnual: number | null;
  distanciaSubestacion: number | null;
  coberturaElectrica: number | null;
  pobrezaEnergetica: number | null;
  vocacionSuelo: string;
  riesgoTerritorial: string;
};

export type MunicipalAreaAnalysis = {
  municipios: MunicipalAreaRecord[];
  muestrasEnArea: number;
  metodo: "muestras_y_centroides";
};

type MapMode = "select" | "draw" | "measure";

type InteractiveMapProps = {
  sites: BondMapSite[];
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  layers: BondMapLayer[];
  onToggleLayer: (layerId: string) => void;
  layersOpen: boolean;
  onToggleLayersPanel: () => void;
  onOpenLayerAdmin: () => void;
  onAreaAnalyzed: (analysis: MunicipalAreaAnalysis) => void;
};

const emptyCollection = (): FeatureCollection => ({ type: "FeatureCollection", features: [] });

const demoLayers: Record<string, FeatureCollection> = {
  solar: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "Potencial solar alto · muestra" },
        geometry: {
          type: "Polygon",
          coordinates: [[[-74.38, 9.35], [-72.65, 9.35], [-72.42, 10.45], [-73.28, 10.92], [-74.32, 10.45], [-74.38, 9.35]]],
        },
      },
    ],
  },
  grid: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "Corredor eléctrico de referencia" },
        geometry: { type: "LineString", coordinates: [[-74.18, 10.91], [-73.72, 10.55], [-73.25, 10.15], [-72.92, 9.77]] },
      },
      {
        type: "Feature",
        properties: { label: "Conexión de referencia" },
        geometry: { type: "LineString", coordinates: [[-73.72, 10.55], [-72.84, 11.18], [-72.33, 11.45]] },
      },
    ],
  },
  runap: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "Sensibilidad ambiental · muestra" },
        geometry: {
          type: "Polygon",
          coordinates: [[[-74.22, 10.58], [-73.75, 10.73], [-73.21, 10.96], [-72.82, 10.78], [-73.06, 10.23], [-73.71, 10.18], [-74.22, 10.58]]],
        },
      },
    ],
  },
  ethnic: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "Contexto étnico · muestra" },
        geometry: {
          type: "Polygon",
          coordinates: [[[-72.92, 11.02], [-72.08, 11.03], [-71.84, 11.72], [-72.63, 11.93], [-73.02, 11.48], [-72.92, 11.02]]],
        },
      },
    ],
  },
  land: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "Suelo rural · muestra" },
        geometry: {
          type: "Polygon",
          coordinates: [[[-74.55, 9.62], [-73.74, 9.62], [-73.55, 10.18], [-74.19, 10.39], [-74.55, 9.62]]],
        },
      },
    ],
  },
  security: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "Alerta territorial · muestra" },
        geometry: {
          type: "Polygon",
          coordinates: [[[-73.81, 9.48], [-73.18, 9.57], [-73.06, 10.02], [-73.49, 10.26], [-73.98, 9.93], [-73.81, 9.48]]],
        },
      },
    ],
  },
};

const layerIds: Record<string, string[]> = {
  municipal: ["bond-municipios", "bond-municipios-aoi"],
  solar: ["bond-solar-fill", "bond-solar-outline"],
  grid: ["bond-grid"],
  runap: ["bond-runap-fill", "bond-runap-outline"],
  ethnic: ["bond-ethnic-fill", "bond-ethnic-outline"],
  land: ["bond-land-fill", "bond-land-outline"],
  security: ["bond-security-fill", "bond-security-outline"],
};

const namedPlaces: Record<string, [number, number]> = {
  bosconia: [-73.89, 9.98],
  "el copey": [-73.96, 10.15],
  valledupar: [-73.25, 10.46],
  riohacha: [-72.91, 11.54],
  santaarta: [-74.2, 11.24],
  "santa marta": [-74.2, 11.24],
};

function distanceKm(a: Position, b: Position) {
  const radius = 6371;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = radians(b[1] - a[1]);
  const deltaLng = radians(b[0] - a[0]);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function walkCoordinates(value: unknown, callback: (position: Position) => void) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    callback(value as Position);
    return;
  }
  value.forEach((child) => walkCoordinates(child, callback));
}

function boundsForCollection(collection: FeatureCollection) {
  const bounds = new maplibregl.LngLatBounds();
  const extendGeometry = (geometry: Geometry) => {
    if (geometry.type === "GeometryCollection") {
      geometry.geometries.forEach(extendGeometry);
      return;
    }
    walkCoordinates(geometry.coordinates, (position) => bounds.extend(position as [number, number]));
  };
  collection.features.forEach((feature) => extendGeometry(feature.geometry));
  return bounds.isEmpty() ? null : bounds;
}

function pointInPolygon(point: Position, ring: Position[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const crosses = (y > point[1]) !== (previousY > point[1]);
    const intersection = ((previousX - x) * (point[1] - y)) / (previousY - y || Number.EPSILON) + x;
    if (crosses && point[0] < intersection) inside = !inside;
  }
  return inside;
}

function parseKml(text: string): FeatureCollection {
  const documentNode = new DOMParser().parseFromString(text, "text/xml");
  if (documentNode.querySelector("parsererror")) throw new Error("El KML no tiene una estructura XML válida.");

  const features: Feature<Geometry>[] = [];
  documentNode.querySelectorAll("Placemark").forEach((placemark, index) => {
    const name = placemark.querySelector("name")?.textContent?.trim() || `Elemento ${index + 1}`;
    const coordinateText = placemark.querySelector("coordinates")?.textContent?.trim();
    if (!coordinateText) return;
    const coordinates = coordinateText
      .split(/\s+/)
      .map((tuple) => tuple.split(",").slice(0, 2).map(Number))
      .filter((position) => position.length === 2 && position.every(Number.isFinite)) as Position[];
    if (!coordinates.length) return;

    let geometry: Geometry;
    if (placemark.querySelector("Polygon")) {
      const ring = [...coordinates];
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
      geometry = { type: "Polygon", coordinates: [ring] };
    } else if (placemark.querySelector("LineString")) {
      geometry = { type: "LineString", coordinates };
    } else {
      geometry = { type: "Point", coordinates: coordinates[0] };
    }
    features.push({ type: "Feature", properties: { name }, geometry });
  });
  if (!features.length) throw new Error("No se encontraron geometrías compatibles en el KML.");
  return { type: "FeatureCollection", features };
}

function normalizeGeoJson(value: unknown): FeatureCollection {
  if (!value || typeof value !== "object") throw new Error("El archivo no contiene JSON válido.");
  const candidate = value as { type?: string; features?: Feature<Geometry>[]; geometry?: Geometry; properties?: Record<string, unknown> };
  if (candidate.type === "FeatureCollection" && Array.isArray(candidate.features)) return candidate as FeatureCollection;
  if (candidate.type === "Feature" && candidate.geometry) {
    return { type: "FeatureCollection", features: [candidate as Feature<Geometry>] };
  }
  if (candidate.type && "coordinates" in candidate) {
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: candidate as Geometry }] };
  }
  throw new Error("Se esperaba un FeatureCollection, Feature o Geometry GeoJSON.");
}

function MapToolButton({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`icon-button ${active ? "active" : ""}`} type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export default function InteractiveMap({
  sites,
  selectedSiteId,
  onSelectSite,
  layers,
  onToggleLayer,
  layersOpen,
  onToggleLayersPanel,
  onOpenLayerAdmin,
  onAreaAnalyzed,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<MapMode>("select");
  const drawPointsRef = useRef<Position[]>([]);
  const measurePointsRef = useRef<Position[]>([]);
  const exportCollectionRef = useRef<FeatureCollection>(emptyCollection());
  const selectSiteRef = useRef(onSelectSite);
  const analyzeAreaRef = useRef(onAreaAnalyzed);
  const municipalPlacesRef = useRef<Record<string, [number, number]>>({});
  const municipalFeaturesRef = useRef<FeatureCollection>(emptyCollection());
  const municipalSamplesRef = useRef<FeatureCollection>(emptyCollection());
  const [mode, setMode] = useState<MapMode>("select");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Mapa listo · capas de muestra, no oficiales");
  const [cursor, setCursor] = useState("10.4600, -73.2500");
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    selectSiteRef.current = onSelectSite;
  }, [onSelectSite]);

  useEffect(() => {
    analyzeAreaRef.current = onAreaAnalyzed;
  }, [onAreaAnalyzed]);

  const analyzePolygon = (ring: Position[]) => {
    const municipalityFeatures = municipalFeaturesRef.current.features.filter((feature) => feature.geometry.type === "Point");
    if (!municipalityFeatures.length) {
      setStatus("La capa municipal todavía está cargando; vuelve a cerrar el polígono en unos segundos");
      return;
    }

    const selected = new Map<string, { feature: Feature; muestras: number; centroide: boolean }>();
    municipalSamplesRef.current.features.forEach((feature) => {
      if (feature.geometry.type !== "Point" || !pointInPolygon(feature.geometry.coordinates, ring)) return;
      const properties = feature.properties ?? {};
      const key = `${properties.departamento}|${properties.municipio}`;
      const previous = selected.get(key) ?? { feature, muestras: 0, centroide: false };
      previous.muestras += 1;
      selected.set(key, previous);
    });

    municipalityFeatures.forEach((feature) => {
      if (feature.geometry.type !== "Point") return;
      const properties = feature.properties ?? {};
      const key = `${properties.departamento}|${properties.municipio}`;
      if (!pointInPolygon(feature.geometry.coordinates, ring) && !selected.has(key)) return;
      const previous = selected.get(key) ?? { feature, muestras: 0, centroide: false };
      previous.feature = feature;
      previous.centroide = pointInPolygon(feature.geometry.coordinates, ring);
      selected.set(key, previous);
    });

    const municipalities = [...selected.values()]
      .map(({ feature, muestras, centroide }) => {
        const properties = feature.properties ?? {};
        const number = (value: unknown) => typeof value === "number" ? value : null;
        return {
          departamento: String(properties.departamento ?? ""),
          municipio: String(properties.municipio ?? ""),
          muestrasEnArea: muestras,
          centroideEnArea: centroide,
          energiaSolarAnual: number(properties.energia_solar_anual_kwhm2),
          distanciaSubestacion: number(properties.distancia_subestacion_km),
          coberturaElectrica: number(properties.cobertura_electrica_icee),
          pobrezaEnergetica: number(properties.pobreza_energetica),
          vocacionSuelo: String(properties.vocacion_suelo_predominante ?? "Sin dato"),
          riesgoTerritorial: String(properties.nivel_riesgo_predominante ?? "Sin dato"),
        };
      })
      .sort((a, b) => b.muestrasEnArea - a.muestrasEnArea || a.municipio.localeCompare(b.municipio, "es"));

    const highlighted = municipalityFeatures.filter((feature) => {
      const properties = feature.properties ?? {};
      return selected.has(`${properties.departamento}|${properties.municipio}`);
    });
    (mapRef.current?.getSource("bond-municipios-aoi") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: highlighted });
    const samplesInArea = municipalities.reduce((total, municipality) => total + municipality.muestrasEnArea, 0);
    analyzeAreaRef.current({ municipios: municipalities, muestrasEnArea: samplesInArea, metodo: "muestras_y_centroides" });
    setStatus(municipalities.length
      ? `${municipalities.length} municipios detectados · ${samplesInArea} muestras territoriales en el área`
      : "No se detectaron municipios con evidencia dentro del polígono");
  };

  useEffect(() => {
    modeRef.current = mode;
    const map = mapRef.current;
    if (!map) return;
    if (mode === "draw") {
      map.doubleClickZoom.disable();
      map.getCanvas().style.cursor = "crosshair";
      setStatus("Dibujo activo · haz clic para añadir vértices y doble clic para cerrar");
    } else if (mode === "measure") {
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = "crosshair";
      setStatus("Medición activa · selecciona dos puntos");
    } else {
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = "";
      setStatus("Selección activa · haz clic en un sitio para evaluarlo");
    }
  }, [mode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [-73.35, 4.65],
      zoom: 4.7,
      minZoom: 4,
      maxZoom: 17,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm-base", type: "raster", source: "osm", paint: { "raster-saturation": -0.42, "raster-contrast": 0.04 } }],
      },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const updateSketch = (collection: FeatureCollection) => {
      exportCollectionRef.current = collection;
      const source = map.getSource("bond-sketch") as GeoJSONSource | undefined;
      source?.setData(collection);
    };

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      const currentMode = modeRef.current;
      const point: Position = [event.lngLat.lng, event.lngLat.lat];
      if (currentMode === "draw") {
        drawPointsRef.current.push(point);
        const points = drawPointsRef.current;
        const geometry: Geometry = points.length > 2
          ? { type: "Polygon", coordinates: [[...points, points[0]]] }
          : { type: "LineString", coordinates: points };
        updateSketch({ type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "AOI en dibujo" }, geometry }] });
        setStatus(`${points.length} vértices · doble clic para cerrar el polígono`);
      }
      if (currentMode === "measure") {
        const points = measurePointsRef.current;
        if (points.length >= 2) points.splice(0, points.length);
        points.push(point);
        const geometry: Geometry = points.length === 1 ? { type: "Point", coordinates: points[0] } : { type: "LineString", coordinates: points };
        updateSketch({ type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "Medición" }, geometry }] });
        if (points.length === 2) setStatus(`Distancia: ${distanceKm(points[0], points[1]).toFixed(2)} km`);
        else setStatus("Selecciona el segundo punto");
      }
    };

    const handleDoubleClick = (event: maplibregl.MapMouseEvent) => {
      if (modeRef.current !== "draw") return;
      event.preventDefault();
      const raw = drawPointsRef.current;
      const unique = raw.filter((position, index) => index === 0 || position[0] !== raw[index - 1][0] || position[1] !== raw[index - 1][1]);
      if (unique.length < 3) {
        setStatus("El polígono necesita al menos tres vértices");
        return;
      }
      const ring = [...unique, unique[0]];
      const collection: FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: { name: "AOI dibujada", source: "Usuario" }, geometry: { type: "Polygon", coordinates: [ring] } }],
      };
      drawPointsRef.current = [];
      updateSketch(collection);
      analyzePolygon(ring);
      setMode("select");
    };

    const handleMove = (event: maplibregl.MapMouseEvent) => {
      setCursor(`${event.lngLat.lat.toFixed(4)}, ${event.lngLat.lng.toFixed(4)}`);
    };

    map.on("load", () => {
      const siteCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: sites.map((site, index) => ({
          type: "Feature",
          properties: { id: site.id, index: index + 1, name: site.name, score: site.score, decision: site.decision },
          geometry: { type: "Point", coordinates: site.coordinates },
        })),
      };

      map.addSource("bond-sites", { type: "geojson", data: siteCollection });
      map.addLayer({ id: "bond-sites", type: "circle", source: "bond-sites", paint: { "circle-radius": 8, "circle-color": "#2d7158", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
      map.addLayer({ id: "bond-sites-selected", type: "circle", source: "bond-sites", filter: ["==", ["get", "id"], selectedSiteId], paint: { "circle-radius": 13, "circle-color": "#1f6b50", "circle-opacity": 0.18, "circle-stroke-color": "#1f6b50", "circle-stroke-width": 2 } });

      const addPolygonLayer = (id: string, color: string, opacity: number) => {
        map.addSource(`bond-${id}`, { type: "geojson", data: demoLayers[id] });
        map.addLayer({ id: `bond-${id}-fill`, type: "fill", source: `bond-${id}`, paint: { "fill-color": color, "fill-opacity": opacity } });
        map.addLayer({ id: `bond-${id}-outline`, type: "line", source: `bond-${id}`, paint: { "line-color": color, "line-width": 2, "line-opacity": 0.9 } });
      };
      addPolygonLayer("solar", "#e6a23c", 0.18);
      addPolygonLayer("runap", "#2e8b5e", 0.22);
      addPolygonLayer("ethnic", "#805ca8", 0.2);
      addPolygonLayer("land", "#627487", 0.16);
      addPolygonLayer("security", "#c84c50", 0.18);

      map.addSource("bond-grid", { type: "geojson", data: demoLayers.grid });
      map.addLayer({ id: "bond-grid", type: "line", source: "bond-grid", paint: { "line-color": "#2e70bd", "line-width": 3, "line-opacity": 0.88 } });

      map.addSource("bond-municipios", { type: "geojson", data: emptyCollection() });
      map.addLayer({
        id: "bond-municipios",
        type: "circle",
        source: "bond-municipios",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2.5, 7, 4.5, 10, 7],
          "circle-color": ["interpolate", ["linear"], ["coalesce", ["get", "energia_solar_anual_kwhm2"], 0], 2500, "#c9d9d1", 4500, "#e6a23c", 6500, "#bd5a3c"],
          "circle-opacity": 0.78,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 0.7,
        },
      });
      map.addSource("bond-municipios-aoi", { type: "geojson", data: emptyCollection() });
      map.addLayer({ id: "bond-municipios-aoi", type: "circle", source: "bond-municipios-aoi", paint: { "circle-radius": 9, "circle-color": "#ffffff", "circle-opacity": 0.15, "circle-stroke-color": "#1f6b50", "circle-stroke-width": 2 } });

      void fetch("/data/municipios_prefactibilidad.geojson")
        .then((response) => {
          if (!response.ok) throw new Error("No se pudo cargar la capa municipal");
          return response.json() as Promise<FeatureCollection>;
        })
        .then((collection) => {
          (map.getSource("bond-municipios") as GeoJSONSource).setData(collection);
          municipalFeaturesRef.current = collection;
          municipalPlacesRef.current = Object.fromEntries(
            collection.features
              .filter((feature) => feature.geometry.type === "Point")
              .map((feature) => [
                `${String(feature.properties?.municipio ?? "").toLowerCase()}, ${String(feature.properties?.departamento ?? "").toLowerCase()}`,
                feature.geometry.coordinates as [number, number],
              ]),
          );
          setStatus(`${collection.features.length} municipios cargados · selecciona un punto para ver sus indicadores`);
        })
        .catch(() => setStatus("No fue posible cargar la capa municipal; las herramientas del mapa siguen disponibles"));
      void fetch("/data/muestras_municipales_origen.geojson")
        .then((response) => response.ok ? response.json() as Promise<FeatureCollection> : emptyCollection())
        .then((collection) => { municipalSamplesRef.current = collection; });

      map.addSource("bond-uploaded", { type: "geojson", data: emptyCollection() });
      map.addLayer({ id: "bond-uploaded-fill", type: "fill", source: "bond-uploaded", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#e6a23c", "fill-opacity": 0.3 } });
      map.addLayer({ id: "bond-uploaded-line", type: "line", source: "bond-uploaded", paint: { "line-color": "#9b641c", "line-width": 3 } });
      map.addLayer({ id: "bond-uploaded-point", type: "circle", source: "bond-uploaded", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 7, "circle-color": "#e6a23c", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });

      map.addSource("bond-sketch", { type: "geojson", data: emptyCollection() });
      map.addLayer({ id: "bond-sketch-fill", type: "fill", source: "bond-sketch", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#d18a2d", "fill-opacity": 0.25 } });
      map.addLayer({ id: "bond-sketch-line", type: "line", source: "bond-sketch", paint: { "line-color": "#9b641c", "line-width": 3, "line-dasharray": [2, 1] } });
      map.addLayer({ id: "bond-sketch-point", type: "circle", source: "bond-sketch", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": "#9b641c", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });

      map.on("click", "bond-sites", (event) => {
        const feature = event.features?.[0];
        const id = String(feature?.properties?.id ?? "");
        if (!id) return;
        selectSiteRef.current(id);
        const site = sites.find((candidate) => candidate.id === id);
        if (site) {
          new maplibregl.Popup({ closeButton: false, offset: 14 })
            .setLngLat(site.coordinates)
            .setHTML(`<strong>${site.name}</strong><span>${site.score}/100 · ${site.decision}</span>`)
            .addTo(map);
        }
      });
      map.on("click", "bond-municipios", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const values = feature.properties ?? {};
        const format = (value: unknown, digits = 1) => typeof value === "number" ? value.toLocaleString("es-CO", { maximumFractionDigits: digits }) : "Sin dato";
        new maplibregl.Popup({ closeButton: true, offset: 12, maxWidth: "270px" })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(
            `<strong>${values.municipio ?? "Municipio"}, ${values.departamento ?? ""}</strong>` +
            `<span>${format(values.registros_promediados, 0)} registros promediados</span>` +
            `<hr/><span>Energía solar anual: ${format(values.energia_solar_anual_kwhm2, 0)} kWh/m²</span>` +
            `<span>Distancia a subestación: ${format(values.distancia_subestacion_km)} km</span>` +
            `<span>Cobertura eléctrica: ${format(values.cobertura_electrica_icee, 2)}</span>` +
            `<span>Vocación del suelo: ${values.vocacion_suelo_predominante || "Sin dato"}</span>` +
            `<span>Riesgo territorial: ${values.nivel_riesgo_predominante || "Sin dato"}</span>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "bond-sites", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "bond-sites", () => { map.getCanvas().style.cursor = modeRef.current === "select" ? "" : "crosshair"; });
      map.on("mouseenter", "bond-municipios", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "bond-municipios", () => { map.getCanvas().style.cursor = modeRef.current === "select" ? "" : "crosshair"; });

      setMapLoaded(true);
      setStatus("Mapa listo · capas de muestra, no oficiales");
    });

    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    map.on("mousemove", handleMove);
    map.on("error", (event) => {
      if (String(event.error?.message ?? "").includes("tile")) setStatus("Algunos mosaicos no pudieron cargarse; las herramientas GIS siguen disponibles");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [sites]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map) return;
    map.setFilter("bond-sites-selected", ["==", ["get", "id"], selectedSiteId]);
  }, [selectedSiteId, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map) return;
    layers.forEach((layer) => {
      (layerIds[layer.id] ?? []).forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layer.active ? "visible" : "none");
      });
    });
  }, [layers, mapLoaded]);

  const runSearch = () => {
    const map = mapRef.current;
    const normalized = query.trim().toLowerCase();
    if (!map || !normalized) return;
    let location = namedPlaces[normalized] ?? municipalPlacesRef.current[normalized];
    if (!location) {
      const numbers = normalized.split(/[;,\s]+/).map(Number).filter(Number.isFinite);
      if (numbers.length >= 2) {
        const [first, second] = numbers;
        location = Math.abs(first) <= 90 && Math.abs(second) <= 180 ? [second, first] : [first, second];
      }
    }
    if (!location || Math.abs(location[0]) > 180 || Math.abs(location[1]) > 90) {
      setStatus("No se reconoció la búsqueda. Prueba “Valledupar, Cesar” o “10.46, -73.25”");
      return;
    }
    map.flyTo({ center: location, zoom: 11, essential: true });
    setStatus(`Mapa centrado en ${location[1].toFixed(4)}, ${location[0].toFixed(4)}`);
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const extension = file.name.split(".").pop()?.toLowerCase();
      const collection = extension === "kml" || extension === "kmz" ? parseKml(text) : normalizeGeoJson(JSON.parse(text));
      exportCollectionRef.current = collection;
      const map = mapRef.current;
      (map?.getSource("bond-uploaded") as GeoJSONSource | undefined)?.setData(collection);
      const bounds = boundsForCollection(collection);
      if (bounds) map?.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 900 });
      setStatus(`${file.name}: ${collection.features.length} geometrías cargadas`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No fue posible leer el archivo");
    }
  };

  const clearUserGeometry = () => {
    const collection = emptyCollection();
    exportCollectionRef.current = collection;
    drawPointsRef.current = [];
    measurePointsRef.current = [];
    (mapRef.current?.getSource("bond-sketch") as GeoJSONSource | undefined)?.setData(collection);
    (mapRef.current?.getSource("bond-uploaded") as GeoJSONSource | undefined)?.setData(collection);
    (mapRef.current?.getSource("bond-municipios-aoi") as GeoJSONSource | undefined)?.setData(collection);
    analyzeAreaRef.current({ municipios: [], muestrasEnArea: 0, metodo: "muestras_y_centroides" });
    setMode("select");
    setStatus("Geometrías temporales eliminadas");
  };

  const downloadGeoJson = () => {
    if (!exportCollectionRef.current.features.length) {
      setStatus("Dibuja o carga una geometría antes de exportar");
      return;
    }
    const blob = new Blob([JSON.stringify(exportCollectionRef.current, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bond-area-analizada.geojson";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("GeoJSON exportado");
  };

  return (
    <section className="map-workspace" aria-label="Mapa territorial interactivo">
      <div className="map-toolbar">
        <form className="map-search" onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar lugar o coordenadas" placeholder="Lugar o latitud, longitud" />
          <button type="submit" aria-label="Ejecutar búsqueda">Ir</button>
        </form>
        <div className="tool-cluster">
          <MapToolButton active={mode === "select"} label="Seleccionar sitio" onClick={() => setMode("select")}><MousePointer2 size={17} /></MapToolButton>
          <MapToolButton active={mode === "draw"} label="Dibujar polígono" onClick={() => { drawPointsRef.current = []; setMode("draw"); }}><MapPin size={17} /></MapToolButton>
          <MapToolButton active={mode === "measure"} label="Medir distancia" onClick={() => { measurePointsRef.current = []; setMode("measure"); }}><Ruler size={17} /></MapToolButton>
          <MapToolButton label="Ver Colombia" onClick={() => mapRef.current?.fitBounds([[-79.2, -4.3], [-66.7, 13.7]], { padding: 40, duration: 900 })}><Maximize2 size={17} /></MapToolButton>
          <MapToolButton label="Cargar GeoJSON o KML" onClick={() => fileInputRef.current?.click()}><Upload size={17} /></MapToolButton>
          <MapToolButton label="Exportar geometría" onClick={downloadGeoJson}><Download size={17} /></MapToolButton>
          <MapToolButton label="Limpiar geometrías" onClick={clearUserGeometry}><Trash2 size={17} /></MapToolButton>
          <input ref={fileInputRef} className="map-file-input" type="file" accept=".geojson,.json,.kml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.currentTarget.value = ""; }} />
        </div>
      </div>

      <div className="map-canvas real-map-canvas">
        <div ref={containerRef} className="maplibre-container" />
        <div className="map-status" role="status"><span className={mapLoaded ? "online" : ""} />{status}</div>
        <div className="map-coordinates">WGS84 · {cursor}</div>
        <div className="map-legend">
          <span><i className="legend-opportunity" /> Oportunidad</span>
          <span><i className="legend-restriction" /> Restricción</span>
          <span><i className="legend-grid" /> Red</span>
          <span><i className="legend-municipal" /> Municipios</span>
        </div>

        <aside className={`layer-panel ${layersOpen ? "open" : "closed"}`}>
          <div className="layer-panel-header">
            <button type="button" className="layer-title" onClick={onToggleLayersPanel}>
              <Layers3 size={17} /> Capas <span>{layers.filter((layer) => layer.active).length}</span>
            </button>
            <button className="icon-button" type="button" aria-label={layersOpen ? "Ocultar capas" : "Mostrar capas"} title={layersOpen ? "Ocultar capas" : "Mostrar capas"} onClick={onToggleLayersPanel}>
              {layersOpen ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {layersOpen && (
            <div className="layer-list">
              {layers.map((layer) => (
                <label key={layer.id} className="layer-row">
                  <input type="checkbox" checked={layer.active} onChange={() => onToggleLayer(layer.id)} />
                  <span className="switch" />
                  <i style={{ background: layer.color }} />
                  <span><strong>{layer.label}</strong><small>{layer.group} · muestra</small></span>
                </label>
              ))}
              <button className="text-button full" type="button" onClick={onOpenLayerAdmin}>Administrar capas <span>→</span></button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
