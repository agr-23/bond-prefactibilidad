"use client";

import { useMemo, useState } from "react";
import InteractiveMap, { type MunicipalAreaAnalysis } from "./InteractiveMap";
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  CloudUpload,
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileText,
  Files,
  Filter,
  GitCompareArrows,
  History,
  Info,
  Landmark,
  Layers3,
  LayoutDashboard,
  Leaf,
  Map,
  MapPin,
  Maximize2,
  Menu,
  MoreHorizontal,
  MousePointer2,
  Plus,
  Radio,
  Route,
  Ruler,
  ScanSearch,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  Table2,
  Upload,
  Users,
  Wind,
  X,
  XCircle,
  Zap,
} from "lucide-react";

type NavKey =
  | "Portafolio"
  | "Explorador"
  | "Evaluaciones"
  | "Comparador"
  | "Riesgos"
  | "Permisos"
  | "Reportes"
  | "Capas y variables";

type Site = {
  id: string;
  name: string;
  place: string;
  technology: string;
  capacity: string;
  score: number;
  decision: "GO" | "CONDITIONAL GO" | "NO-GO";
  coordinates: [number, number];
  dimensions: Record<string, number>;
};

type ActiveProject = {
  name: string;
  technology: string;
};

const sites: Site[] = [
  {
    id: "s1",
    name: "Sitio Aurora",
    place: "Cesar · Área de muestra",
    technology: "Solar FV",
    capacity: "120 MWp",
    score: 74,
    decision: "CONDITIONAL GO",
    coordinates: [-73.89, 9.98],
    dimensions: {
      Técnico: 88,
      Ambiental: 71,
      Social: 54,
      Regulatorio: 69,
      Económico: 76,
      Conexión: 82,
      Seguridad: 61,
    },
  },
  {
    id: "s2",
    name: "Sitio Brisa",
    place: "La Guajira · Área de muestra",
    technology: "Eólica",
    capacity: "180 MW",
    score: 68,
    decision: "CONDITIONAL GO",
    coordinates: [-72.45, 11.35],
    dimensions: {
      Técnico: 92,
      Ambiental: 64,
      Social: 42,
      Regulatorio: 61,
      Económico: 73,
      Conexión: 65,
      Seguridad: 56,
    },
  },
  {
    id: "s3",
    name: "Sitio Delta",
    place: "Magdalena · Área de muestra",
    technology: "Solar + BESS",
    capacity: "95 MWp",
    score: 81,
    decision: "GO",
    coordinates: [-74.1, 10.6],
    dimensions: {
      Técnico: 84,
      Ambiental: 83,
      Social: 72,
      Regulatorio: 78,
      Económico: 79,
      Conexión: 87,
      Seguridad: 70,
    },
  },
];

const layerSeed = [
  { id: "municipal", label: "Indicadores municipales BOND", group: "Datos BOND", color: "#1f6b50", active: true },
  { id: "solar", label: "Recurso solar", group: "Técnica", color: "#e6a23c", active: true },
  { id: "grid", label: "Infraestructura eléctrica", group: "Conexión", color: "#2979ff", active: true },
  { id: "runap", label: "Áreas protegidas", group: "Ambiental", color: "#348c61", active: true },
  { id: "ethnic", label: "Territorios étnicos", group: "Social", color: "#8c63c7", active: true },
  { id: "land", label: "Clasificación del suelo", group: "Regulatoria", color: "#627487", active: false },
  { id: "security", label: "Riesgo territorial", group: "Seguridad", color: "#d4514f", active: true },
];

const navItems: Array<{ key: NavKey; icon: typeof Map; group: string }> = [
  { key: "Portafolio", icon: LayoutDashboard, group: "OPERACIÓN" },
  { key: "Explorador", icon: Map, group: "ANÁLISIS" },
  { key: "Evaluaciones", icon: ScanSearch, group: "ANÁLISIS" },
  { key: "Comparador", icon: GitCompareArrows, group: "ANÁLISIS" },
  { key: "Riesgos", icon: ShieldAlert, group: "DECISIÓN" },
  { key: "Permisos", icon: ClipboardCheck, group: "DECISIÓN" },
  { key: "Reportes", icon: Files, group: "SALIDAS" },
  { key: "Capas y variables", icon: Database, group: "DATOS" },
];

const scenarioOptions = ["Balanceado", "Técnico", "Ambiental", "Social", "Conservador"];

const decisionClass = (decision: Site["decision"]) => {
  if (decision === "GO") return "decision-go";
  if (decision === "NO-GO") return "decision-no-go";
  return "decision-conditional";
};

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export default function BondApp() {
  const [activeView, setActiveView] = useState<NavKey>("Explorador");
  const [scenario, setScenario] = useState("Balanceado");
  const [selectedSiteId, setSelectedSiteId] = useState("s1");
  const [layers, setLayers] = useState(layerSeed);
  const [layersOpen, setLayersOpen] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectTechnology, setProjectTechnology] = useState("Solar FV");
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [municipalAnalysis, setMunicipalAnalysis] = useState<MunicipalAreaAnalysis>({ municipios: [], muestrasEnArea: 0, metodo: "muestras_y_centroides" });
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0],
    [selectedSiteId],
  );

  const toggleLayer = (id: string) => {
    setLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, active: !layer.active } : layer)));
  };

  const openUpload = () => {
    setUploadStep(1);
    setUploadedFile("");
    setUploadOpen(true);
  };

  const navigate = (key: NavKey) => {
    setActiveView(key);
    setMobileNavOpen(false);
  };

  const createProject = () => {
    setActiveProject({ name: projectName.trim() || "Nueva evaluación territorial", technology: projectTechnology });
    setMunicipalAnalysis({ municipios: [], muestrasEnArea: 0, metodo: "muestras_y_centroides" });
    setProjectOpen(false);
    setActiveView("Explorador");
  };

  const renderScenarioControl = () => (
    <div className="scenario-control" aria-label="Escenario de evaluación">
      {scenarioOptions.map((option) => (
        <button
          key={option}
          type="button"
          className={scenario === option ? "active" : ""}
          onClick={() => setScenario(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );

  const renderExplorer = () => (
    <div className="view explorer-view">
      <div className="view-header compact-header">
        <div>
          <div className="eyebrow-row">
            <span>Evaluación activa</span>
            <span className="demo-badge">DATOS MUNICIPALES</span>
          </div>
          <h1>Explorador territorial</h1>
        </div>
        <div className="header-actions">
          {renderScenarioControl()}
          <button className="secondary-button" type="button" onClick={() => setActiveView("Comparador")}>
            <GitCompareArrows size={16} /> Comparar sitios
          </button>
          <button className="primary-button" type="button" onClick={() => setReportOpen(true)}>
            <FileText size={16} /> Generar reporte
          </button>
        </div>
      </div>

      <div className="evaluator-layout">
        <InteractiveMap
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={setSelectedSiteId}
          layers={layers}
          onToggleLayer={toggleLayer}
          layersOpen={layersOpen}
          onToggleLayersPanel={() => setLayersOpen((open) => !open)}
          onOpenLayerAdmin={() => setActiveView("Capas y variables")}
          onAreaAnalyzed={setMunicipalAnalysis}
        />

        <aside className="evaluation-panel">
          {activeProject && (
            <section className="project-area-summary">
              <span className="micro-label">PROYECTO ACTIVO</span>
              <strong>{activeProject.name}</strong>
              <small>{activeProject.technology} · Dibuja y cierra el polígono para leer municipios.</small>
            </section>
          )}
          {municipalAnalysis.municipios.length > 0 && (
            <section className="municipal-results">
              <div className="section-title-row"><h3>Municipios en el área</h3><span className="count-badge">{municipalAnalysis.municipios.length}</span></div>
              <p>{municipalAnalysis.muestrasEnArea} muestras territoriales detectadas. Incluye municipios con muestras o centroide dentro del polígono.</p>
              <div className="municipal-result-list">
                {municipalAnalysis.municipios.map((municipality) => (
                  <article key={`${municipality.departamento}-${municipality.municipio}`}>
                    <div><strong>{municipality.municipio}</strong><span>{municipality.departamento}</span></div>
                    <small>{municipality.muestrasEnArea} muestras · {municipality.centroideEnArea ? "centroide dentro" : "cruce por evidencia"}</small>
                    <dl>
                      <div><dt>Solar anual</dt><dd>{municipality.energiaSolarAnual?.toLocaleString("es-CO", { maximumFractionDigits: 0 }) ?? "Sin dato"} kWh/m²</dd></div>
                      <div><dt>Subestación</dt><dd>{municipality.distanciaSubestacion?.toLocaleString("es-CO", { maximumFractionDigits: 1 }) ?? "Sin dato"} km</dd></div>
                      <div><dt>Cobertura ICEE</dt><dd>{municipality.coberturaElectrica?.toLocaleString("es-CO", { maximumFractionDigits: 2 }) ?? "Sin dato"}</dd></div>
                      <div><dt>Suelo</dt><dd>{municipality.vocacionSuelo}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
              <small className="municipal-method-note">Cruce preliminar con puntos territoriales y centroides municipales; no reemplaza límites oficiales DIVIPOLA.</small>
            </section>
          )}
          <div className="site-selector-row">
            <div>
              <span className="micro-label">SITIO SELECCIONADO</span>
              <select value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)} aria-label="Sitio seleccionado">
                {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            <IconButton label="Más opciones"><MoreHorizontal size={18} /></IconButton>
          </div>

          <div className="decision-summary">
            <div className="score-ring" style={{ "--score": `${selectedSite.score * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{selectedSite.score}</strong><span>/100</span></div>
            </div>
            <div>
              <span className={`decision-pill ${decisionClass(selectedSite.decision)}`}>{selectedSite.decision}</span>
              <h2>{selectedSite.name}</h2>
              <p>{selectedSite.place} · {selectedSite.technology} · {selectedSite.capacity}</p>
            </div>
          </div>

          <div className="confidence-note">
            <Info size={15} /> Confianza media-alta · 18 de 22 variables con fuente vigente
          </div>

          <section className="panel-section">
            <div className="section-title-row">
              <h3>Scores por dimensión</h3>
              <button type="button" className="text-button"><SlidersHorizontal size={14} /> Pesos</button>
            </div>
            <div className="dimension-list">
              {Object.entries(selectedSite.dimensions).map(([name, value]) => (
                <div className="dimension-row" key={name}>
                  <span>{name}</span>
                  <div className="bar"><i style={{ width: `${value}%` }} /></div>
                  <strong className={value < 60 ? "low" : value > 79 ? "high" : ""}>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-section alert-section">
            <div className="section-title-row">
              <h3>Alertas que condicionan</h3>
              <span className="count-badge">3</span>
            </div>
            <div className="alert-item critical">
              <AlertTriangle size={17} />
              <div><strong>Riesgo social alto</strong><span>Requiere verificación territorial y estrategia temprana.</span></div>
            </div>
            <div className="alert-item warning">
              <Route size={17} />
              <div><strong>Acceso vial por confirmar</strong><span>El tramo final no tiene fuente reciente validada.</span></div>
            </div>
            <div className="alert-item warning">
              <Landmark size={17} />
              <div><strong>Compatibilidad POT pendiente</strong><span>Verificar uso de suelo con la entidad territorial.</span></div>
            </div>
          </section>

          <div className="panel-footer">
            <button className="secondary-button" type="button" onClick={() => setActiveView("Riesgos")}>Ver riesgos</button>
            <button className="primary-button" type="button" onClick={() => setActiveView("Evaluaciones")}>Abrir evaluación <ArrowRight size={16} /></button>
          </div>
        </aside>
      </div>
    </div>
  );

  const renderPortfolio = () => (
    <div className="view scroll-view">
      <div className="view-header">
        <div><span className="eyebrow">PORTAFOLIO ACTIVO</span><h1>Proyectos y decisiones</h1><p>Seguimiento preliminar de oportunidades energéticas.</p></div>
        <button className="primary-button" type="button" onClick={() => setProjectOpen(true)}><Plus size={16} /> Nuevo proyecto</button>
      </div>
      <div className="metric-grid">
        <article><span>Proyectos activos</span><strong>8</strong><small>3 con decisión reciente</small></article>
        <article><span>Sitios evaluados</span><strong>24</strong><small>12 listos para comparar</small></article>
        <article><span>Conditional Go</span><strong className="amber-text">11</strong><small>Requieren mitigación</small></article>
        <article><span>Alertas críticas</span><strong className="red-text">5</strong><small>2 sin responsable</small></article>
      </div>
      <div className="content-grid two-thirds">
        <section className="surface-section">
          <div className="section-heading"><div><h2>Portafolio Caribe 2026</h2><p>Datos de demostración del flujo MVP.</p></div><button className="secondary-button" type="button"><Filter size={15} /> Filtrar</button></div>
          <div className="data-table project-table">
            <div className="table-head"><span>Proyecto</span><span>Tecnología</span><span>Sitios</span><span>Última decisión</span><span>Actualizado</span></div>
            {[
              ["Corredor Cesar", "Solar FV", "6", "CONDITIONAL GO", "Hoy"],
              ["Vientos Norte", "Eólica", "4", "GO", "Ayer"],
              ["BESS Caribe", "BESS", "3", "CONDITIONAL GO", "06 jul"],
              ["Autogeneración Centro", "Solar FV", "5", "EN ANÁLISIS", "03 jul"],
            ].map((row) => (
              <button type="button" className="table-row" key={row[0]} onClick={() => setActiveView("Explorador")}>
                <span><strong>{row[0]}</strong><small>Cliente demo</small></span><span>{row[1]}</span><span>{row[2]}</span><span><i className={`status-dot ${row[3] === "GO" ? "green" : row[3] === "EN ANÁLISIS" ? "gray" : "amber"}`} />{row[3]}</span><span>{row[4]}</span>
              </button>
            ))}
          </div>
        </section>
        <aside className="surface-section activity-panel">
          <div className="section-heading"><div><h2>Actividad reciente</h2><p>Trazabilidad de decisiones.</p></div></div>
          {[
            ["Score recalculado", "Sitio Aurora · Escenario balanceado", "12 min"],
            ["Capa publicada", "Subestaciones · versión 2.4", "2 h"],
            ["Reporte generado", "Comparativo Caribe · Ejecutivo", "Ayer"],
            ["Validación completada", "Indicadores municipales 2025", "Ayer"],
          ].map((item, index) => (
            <div className="activity-item" key={item[0]}><i>{index + 1}</i><div><strong>{item[0]}</strong><span>{item[1]}</span><small>{item[2]}</small></div></div>
          ))}
        </aside>
      </div>
    </div>
  );

  const renderEvaluations = () => (
    <div className="view scroll-view">
      <div className="view-header">
        <div><span className="eyebrow">EVALUADOR DE SITIO</span><h1>{selectedSite.name}</h1><p>Expediente preliminar y trazable para decisión de prefactibilidad.</p></div>
        <div className="header-actions"><button className="secondary-button" type="button" onClick={() => setActiveView("Explorador")}><Map size={16} /> Ver mapa</button><button className="primary-button" type="button" onClick={() => setReportOpen(true)}><Download size={16} /> Exportar</button></div>
      </div>
      <div className="evaluation-hero">
        <div className="evaluation-identification">
          <div className="technology-icon"><Sun size={24} /></div>
          <div><span className="micro-label">SOLAR FV · 120 MWP</span><h2>Decisión preliminar explicable</h2><p>La oportunidad técnica y de conexión compensa parcialmente alertas sociales y regulatorias que requieren verificación.</p></div>
        </div>
        <div className="evaluation-decision"><span className="decision-pill decision-conditional">CONDITIONAL GO</span><strong>74/100</strong><small>Escenario {scenario.toLowerCase()}</small></div>
      </div>
      <div className="content-grid evaluation-grid">
        <section className="surface-section">
          <div className="section-heading"><div><h2>Supuestos del proyecto</h2><p>Base de cálculo editable.</p></div><button className="text-button" type="button"><Settings size={14} /> Editar</button></div>
          <div className="assumption-grid">
            {[['Tecnología','Solar fotovoltaica'],['Capacidad','120 MWp'],['Área requerida','240 ha'],['CAPEX preliminar','Por definir'],['Distancia máxima a red','15 km'],['Horizonte','2026–2029']].map((item) => <div key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong></div>)}
          </div>
        </section>
        <section className="surface-section">
          <div className="section-heading"><div><h2>Calidad de evidencia</h2><p>Vigencia y cobertura de fuentes.</p></div></div>
          <div className="quality-list">
            <div><span>Variables con fuente validada</span><strong>18/22</strong></div>
            <div><span>Actualización media</span><strong>14 meses</strong></div>
            <div><span>Cobertura del AOI</span><strong>92%</strong></div>
            <div><span>Variables por verificar</span><strong className="amber-text">4</strong></div>
          </div>
        </section>
      </div>
      <section className="surface-section full-section">
        <div className="section-heading"><div><h2>Hallazgos por dimensión</h2><p>Cada conclusión conserva fuente, fecha y regla aplicada.</p></div>{renderScenarioControl()}</div>
        <div className="finding-grid">
          {[
            [Zap,"Técnico y conexión","88 / 82","Irradiación favorable; subestación de referencia dentro del umbral configurado.","positive"],
            [Leaf,"Ambiental","71","Sin bloqueante confirmado; sensibilidad hídrica requiere delimitación detallada.","neutral"],
            [Users,"Social","54","Alerta por contexto territorial; se requiere lectura cualitativa y contacto temprano.","warning"],
            [Landmark,"Regulatorio","69","Compatibilidad municipal pendiente de concepto o verificación documental.","warning"],
          ].map(([Icon,title,value,text,tone]) => (
            <article className={`finding-card ${tone}`} key={String(title)}><div className="finding-icon"><Icon size={18} /></div><div><span>{title as string}</span><strong>{value as string}</strong><p>{text as string}</p><button type="button" className="text-button">Ver evidencia <ArrowRight size={13} /></button></div></article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderComparator = () => (
    <div className="view scroll-view">
      <div className="view-header">
        <div><span className="eyebrow">COMPARADOR MULTICRITERIO</span><h1>Comparación de sitios</h1><p>Tres alternativas bajo el mismo escenario y reglas de bloqueo.</p></div>
        <div className="header-actions">{renderScenarioControl()}<button className="primary-button" type="button" onClick={() => setReportOpen(true)}><FileText size={16} /> Reporte comparativo</button></div>
      </div>
      <div className="recommendation-banner">
        <CheckCircle2 size={22} />
        <div><span>RECOMENDACIÓN PRELIMINAR</span><strong>Priorizar Sitio Delta para debida diligencia detallada</strong><p>Presenta el mejor balance y no registra bloqueantes críticos en la evidencia demo disponible.</p></div>
        <button className="secondary-button" type="button" onClick={() => { setSelectedSiteId("s3"); setActiveView("Evaluaciones"); }}>Abrir sitio <ArrowRight size={15} /></button>
      </div>
      <section className="comparison-table surface-section">
        <div className="comparison-row comparison-header">
          <div className="comparison-label"><span>Criterio</span><small>Escenario: {scenario}</small></div>
          {sites.map((site) => <div key={site.id}><span className={`decision-pill ${decisionClass(site.decision)}`}>{site.decision}</span><h2>{site.name}</h2><p>{site.technology} · {site.capacity}</p><strong className="big-score">{site.score}</strong><small>/100</small></div>)}
        </div>
        {Object.keys(sites[0].dimensions).map((dimension) => (
          <div className="comparison-row" key={dimension}>
            <div className="comparison-label"><strong>{dimension}</strong><small>Peso {dimension === "Técnico" ? "22%" : dimension === "Conexión" ? "18%" : "12%"}</small></div>
            {sites.map((site) => <div key={site.id}><div className="compare-value"><strong>{site.dimensions[dimension]}</strong><div className="bar"><i style={{width:`${site.dimensions[dimension]}%`}} /></div></div></div>)}
          </div>
        ))}
        <div className="comparison-row blockers-row">
          <div className="comparison-label"><strong>Bloqueantes críticos</strong><small>Anulan el score global</small></div>
          <div><CheckCircle2 size={17} /><span>Ninguno confirmado</span></div>
          <div className="warning-cell"><AlertTriangle size={17} /><span>Consulta previa por verificar</span></div>
          <div><CheckCircle2 size={17} /><span>Ninguno confirmado</span></div>
        </div>
      </section>
    </div>
  );

  const renderRisks = () => (
    <div className="view scroll-view">
      <div className="view-header"><div><span className="eyebrow">MATRIZ DE RIESGOS</span><h1>Riesgos y mitigaciones</h1><p>Priorización por severidad, probabilidad, evidencia y capacidad de respuesta.</p></div><div className="header-actions"><button className="secondary-button" type="button"><Filter size={15} /> Filtrar</button><button className="primary-button" type="button"><Plus size={16} /> Añadir riesgo</button></div></div>
      <div className="risk-summary-strip">
        <div><span>Críticos</span><strong className="red-text">1</strong></div><div><span>Altos</span><strong className="amber-text">3</strong></div><div><span>Medios</span><strong>5</strong></div><div><span>Sin responsable</span><strong>2</strong></div><div className="risk-score"><span>Exposición agregada</span><strong>MEDIA-ALTA</strong></div>
      </div>
      <section className="surface-section risk-table">
        <div className="table-head"><span>Riesgo</span><span>Dimensión</span><span>Severidad</span><span>Probabilidad</span><span>Respuesta recomendada</span><span>Responsable</span></div>
        {[
          ["Consulta previa potencial", "Social", "Crítica", "Media", "Verificar certificación y presencia territorial", "Sin asignar"],
          ["Compatibilidad de uso del suelo", "Regulatoria", "Alta", "Media", "Solicitar concepto municipal y revisar POT", "Jurídico"],
          ["Cruce con drenaje estacional", "Ambiental", "Alta", "Alta", "Levantamiento hidrológico y ajuste del layout", "Ambiental"],
          ["Capacidad firme no confirmada", "Conexión", "Alta", "Media", "Prefactibilidad de conexión con OR", "Eléctrico"],
          ["Acceso logístico parcial", "Técnica", "Media", "Alta", "Verificar gálibos, radios y servidumbre", "Ingeniería"],
        ].map((row) => <div className="table-row" key={row[0]}><span><strong>{row[0]}</strong><small>Evidencia demo · vigencia por verificar</small></span><span>{row[1]}</span><span><i className={`severity ${row[2] === "Crítica" ? "critical" : row[2] === "Alta" ? "high" : "medium"}`} />{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span><span className={row[5] === "Sin asignar" ? "muted" : ""}>{row[5]}</span></div>)}
      </section>
    </div>
  );

  const renderPermits = () => (
    <div className="view scroll-view">
      <div className="view-header"><div><span className="eyebrow">MATRIZ PRELIMINAR</span><h1>Permisos y gestiones</h1><p>Inventario orientativo sujeto a validación jurídica y técnica.</p></div><button className="primary-button" type="button" onClick={() => setReportOpen(true)}><Download size={16} /> Exportar matriz</button></div>
      <div className="notice-banner"><Info size={18} /><span>Esta matriz no reemplaza conceptos de autoridad. Cada requisito conserva supuesto, disparador y fuente pendiente de confirmación.</span></div>
      <section className="surface-section permit-table">
        <div className="table-head"><span>Gestión / permiso</span><span>Entidad orientativa</span><span>Disparador</span><span>Aplicabilidad</span><span>Etapa</span><span>Estado</span></div>
        {[
          ["Concepto de uso del suelo", "Municipio", "Localización del proyecto", "Probable", "Prefactibilidad", "Pendiente"],
          ["Licenciamiento ambiental", "ANLA / autoridad competente", "Capacidad, infraestructura y alcance", "Por definir", "Factibilidad", "Revisar"],
          ["Aprovechamiento forestal", "CAR competente", "Intervención de cobertura", "Condicional", "Diseño", "No iniciado"],
          ["Ocupación de cauce", "CAR competente", "Cruces o intervención hídrica", "Condicional", "Diseño", "No iniciado"],
          ["Certificación de comunidades", "Autoridad competente", "Área de influencia", "Prioritaria", "Prefactibilidad", "Solicitar"],
          ["Conexión eléctrica", "UPME / OR / transportador", "Punto y capacidad de conexión", "Requerida", "Prefactibilidad", "En análisis"],
        ].map((row) => <div className="table-row" key={row[0]}><span><strong>{row[0]}</strong></span><span>{row[1]}</span><span>{row[2]}</span><span><i className={`status-dot ${row[3] === "Requerida" || row[3] === "Prioritaria" ? "amber" : "gray"}`} />{row[3]}</span><span>{row[4]}</span><span><button type="button" className="status-select">{row[5]} <ChevronDown size={13}/></button></span></div>)}
      </section>
    </div>
  );

  const renderReports = () => (
    <div className="view scroll-view">
      <div className="view-header"><div><span className="eyebrow">GENERADOR DE REPORTES</span><h1>Entregables y evidencia</h1><p>Salidas ejecutivas, técnicas y geoespaciales con trazabilidad.</p></div><button className="primary-button" type="button" onClick={() => setReportOpen(true)}><Plus size={16} /> Nuevo reporte</button></div>
      <div className="metric-grid reports-metrics"><article><FileText size={20}/><span>Generados</span><strong>14</strong></article><article><CircleDashed size={20}/><span>En preparación</span><strong>2</strong></article><article><Download size={20}/><span>Descargas</span><strong>37</strong></article><article><Shield size={20}/><span>Con trazabilidad</span><strong>100%</strong></article></div>
      <section className="surface-section reports-list">
        <div className="section-heading"><div><h2>Reportes recientes</h2><p>Los archivos mostrados son registros de demostración.</p></div><button className="secondary-button" type="button"><Search size={15}/> Buscar</button></div>
        {[
          ["Comparativo Portafolio Caribe", "PDF ejecutivo", "3 sitios · Escenario balanceado", "Hoy, 10:42"],
          ["Prefactibilidad Sitio Aurora", "PDF técnico", "22 variables · 3 alertas", "Ayer, 16:18"],
          ["Resultados municipales – Colombia", "CSV", "913 municipios · indicadores consolidados", "Actualizado"],
          ["Áreas analizadas – Corredor Cesar", "GeoJSON", "6 polígonos", "07 jul, 14:32"],
        ].map((row, index) => <div className="report-row" key={row[0]}><div className={`file-icon file-${index}`}><FileText size={18}/></div><div><strong>{row[0]}</strong><span>{row[1]} · {row[2]}</span></div><small>{row[3]}</small><span className="report-status"><CheckCircle2 size={14}/> Listo</span><IconButton label={`Descargar ${row[0]}`}><Download size={17}/></IconButton></div>)}
      </section>
    </div>
  );

  const renderLayersAdmin = () => (
    <div className="view scroll-view">
      <div className="view-header"><div><span className="eyebrow">BACKOFFICE DE DATOS</span><h1>Administrador de Capas y Variables</h1><p>Carga, valida, versiona y publica evidencia geoespacial y municipal.</p></div><button className="primary-button" type="button" onClick={openUpload}><CloudUpload size={16} /> Nueva capa</button></div>
      <div className="admin-tabs"><button className="active" type="button"><Layers3 size={15}/> Capas</button><button type="button"><SlidersHorizontal size={15}/> Variables</button><button type="button"><Database size={15}/> Fuentes</button><button type="button"><ClipboardCheck size={15}/> Reglas de validación</button></div>
      <div className="metric-grid data-metrics"><article><span>Capas publicadas</span><strong>48</strong><small>6 categorías activas</small></article><article><span>En validación</span><strong className="amber-text">4</strong><small>2 requieren corrección</small></article><article><span>Con actualización vencida</span><strong className="red-text">7</strong><small>Según regla configurada</small></article><article><span>Privadas de cliente</span><strong>12</strong><small>Aisladas por organización</small></article></div>
      <section className="surface-section layer-registry">
        <div className="registry-toolbar"><div className="table-search"><Search size={15}/><input aria-label="Buscar capas" placeholder="Buscar capa, fuente o responsable"/></div><button className="secondary-button" type="button"><Filter size={15}/> Filtros</button><button className="secondary-button" type="button"><History size={15}/> Historial</button></div>
        <div className="table-head"><span>Capa</span><span>Categoría</span><span>Tipo</span><span>Fuente / año</span><span>Versión</span><span>Estado</span><span>Actualización</span><span></span></div>
        {[
          ["Subestaciones de referencia", "Conexión", "Punto", "Fuente por confirmar · 2025", "v2.4", "Publicada", "02 jul"],
          ["Indicadores de prefactibilidad municipal", "Multicriterio", "CSV municipal", "Base consolidada · 2026", "v1.0", "Publicada", "Actual"],
          ["Restricciones ambientales", "Ambiental", "Polígono", "Compilación interna · 2025", "v3.1", "En validación", "Hoy"],
          ["Áreas de interés – Cliente A", "Cliente", "Polígono", "Carga privada · 2026", "v1.0", "Privada", "Ayer"],
          ["Velocidad media del viento", "Técnica", "Raster", "Fuente por confirmar · 2023", "v1.8", "Borrador", "14 jun"],
        ].map((row) => <div className="table-row" key={row[0]}><span><i className="layer-type-icon"><Layers3 size={15}/></i><span><strong>{row[0]}</strong><small>ID automático · auditoría activa</small></span></span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span><span><i className={`status-dot ${row[5] === "Publicada" ? "green" : row[5] === "En validación" ? "amber" : "gray"}`}/>{row[5]}</span><span>{row[6]}</span><span><IconButton label={`Opciones de ${row[0]}`}><MoreHorizontal size={16}/></IconButton></span></div>)}
      </section>
    </div>
  );

  const renderCurrentView = () => {
    if (activeView === "Explorador") return renderExplorer();
    if (activeView === "Portafolio") return renderPortfolio();
    if (activeView === "Evaluaciones") return renderEvaluations();
    if (activeView === "Comparador") return renderComparator();
    if (activeView === "Riesgos") return renderRisks();
    if (activeView === "Permisos") return renderPermits();
    if (activeView === "Reportes") return renderReports();
    return renderLayersAdmin();
  };

  return (
    <div className="bond-app">
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand-row"><div className="brand-mark">B</div><div><strong>BOND</strong><span>Territorial Intelligence</span></div></div>
        <button className="org-switcher" type="button"><span className="org-avatar">CE</span><span><strong>Cliente Energía Demo</strong><small>Portafolio Caribe</small></span><ChevronDown size={15}/></button>
        <nav aria-label="Navegación principal">
          {["OPERACIÓN", "ANÁLISIS", "DECISIÓN", "SALIDAS", "DATOS"].map((group) => (
            <div className="nav-group" key={group}><span>{group}</span>{navItems.filter((item) => item.group === group).map(({key,icon:Icon}) => <button className={activeView === key ? "active" : ""} type="button" key={key} onClick={() => navigate(key)}><Icon size={17}/><span>{key}</span>{key === "Riesgos" && <i className="nav-alert">5</i>}</button>)}</div>
          ))}
        </nav>
        <div className="sidebar-footer"><button type="button"><Settings size={17}/> Configuración</button><div className="profile-row"><div>FG</div><span><strong>Felipe Gómez</strong><small>Administrador</small></span><ChevronDown size={14}/></div></div>
      </aside>

      <section className="app-shell">
        <header className="topbar">
          <div className="topbar-left"><IconButton label="Abrir navegación" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={18}/></IconButton><div className="breadcrumbs"><span>Portafolio Caribe 2026</span><ChevronDown size={14}/><i>/</i><strong>{activeView}</strong></div></div>
          <div className="topbar-actions"><button className="global-search" type="button"><Search size={15}/><span>Buscar en BOND</span><kbd>⌘ K</kbd></button><IconButton label="Notificaciones"><Bell size={17}/><i className="notification-dot"/></IconButton><button className="quick-create" type="button" onClick={() => setProjectOpen(true)}><Plus size={17}/><span>Crear</span><ChevronDown size={14}/></button></div>
        </header>
        <main>{renderCurrentView()}</main>
      </section>

      {reportOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="modal-header"><div><span className="eyebrow">EXPORTACIÓN TRAZABLE</span><h2 id="report-title">Generar reporte</h2><p>Selecciona el nivel de detalle y las salidas del análisis.</p></div><IconButton label="Cerrar" onClick={() => setReportOpen(false)}><X size={18}/></IconButton></div>
            <div className="report-type-grid">
              <label className="report-type selected"><input type="radio" name="report" defaultChecked/><FileText size={21}/><span><strong>PDF ejecutivo</strong><small>Decisión, alertas y recomendación</small></span><CheckCircle2 size={17}/></label>
              <label className="report-type"><input type="radio" name="report"/><Files size={21}/><span><strong>PDF técnico</strong><small>Método, variables y evidencia</small></span></label>
              <label className="report-type"><input type="radio" name="report"/><Table2 size={21}/><span><strong>CSV de resultados</strong><small>Scores y variables normalizadas</small></span></label>
              <label className="report-type"><input type="radio" name="report"/><FileJson size={21}/><span><strong>GeoJSON / KML</strong><small>Áreas y hallazgos espaciales</small></span></label>
            </div>
            <div className="modal-form"><label><span>Nombre del reporte</span><input defaultValue={`Prefactibilidad - ${selectedSite.name}`}/></label><label><span>Escenario</span><select defaultValue={scenario}><option>{scenario}</option><option>Conservador</option><option>Técnico</option></select></label></div>
            <div className="check-grid"><label><input type="checkbox" defaultChecked/> Resumen y recomendación</label><label><input type="checkbox" defaultChecked/> Mapa de hallazgos</label><label><input type="checkbox" defaultChecked/> Matriz de riesgos</label><label><input type="checkbox" defaultChecked/> Matriz de permisos</label><label><input type="checkbox" defaultChecked/> Fuentes y vigencia</label><label><input type="checkbox"/> Anexo metodológico</label></div>
            <div className="modal-footer"><span><Shield size={14}/> Incluye fecha, versión y trazabilidad de fuentes.</span><div><button className="secondary-button" type="button" onClick={() => setReportOpen(false)}>Cancelar</button><button className="primary-button" type="button" onClick={() => setReportOpen(false)}><Download size={16}/> Generar borrador</button></div></div>
          </div>
        </div>
      )}

      {projectOpen && (
        <div className="modal-backdrop" role="presentation"><div className="modal project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title">
          <div className="modal-header"><div><span className="eyebrow">NUEVA EVALUACIÓN</span><h2 id="project-title">Crear proyecto</h2><p>Define el contexto mínimo; podrás completar los supuestos después.</p></div><IconButton label="Cerrar" onClick={() => setProjectOpen(false)}><X size={18}/></IconButton></div>
          <div className="modal-form two-col"><label className="span-two"><span>Nombre del proyecto</span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ej. Corredor Solar Norte"/></label><label><span>Organización</span><select><option>Cliente Energía Demo</option></select></label><label><span>Tecnología</span><select value={projectTechnology} onChange={(event) => setProjectTechnology(event.target.value)}><option>Solar FV</option><option>Eólica</option><option>Híbrida</option><option>BESS</option><option>Autogeneración</option></select></label><label><span>Escala inicial</span><select><option>Polígono de análisis</option><option>Municipal</option><option>Departamental</option><option>Predial</option></select></label><label><span>Criterio principal</span><select><option>Balance integral</option><option>Conexión</option><option>Riesgo social</option><option>Restricción ambiental</option></select></label></div>
          <div className="technology-grid">{[[Sun,"Solar FV"],[Wind,"Eólica"],[BatteryCharging,"BESS"],[Zap,"Híbrida"],[Building2,"Autogeneración"]].map(([Icon, label]) => <button className={projectTechnology === label ? "selected" : ""} type="button" key={String(label)} onClick={() => setProjectTechnology(String(label))}><Icon size={20}/><span>{String(label)}</span></button>)}</div>
          <div className="modal-footer"><span>Al crearlo, dibuja el área en el mapa para analizar los municipios alcanzados.</span><div><button className="secondary-button" type="button" onClick={() => setProjectOpen(false)}>Cancelar</button><button className="primary-button" type="button" onClick={createProject}>Crear y definir área <ArrowRight size={16}/></button></div></div>
        </div></div>
      )}

      {uploadOpen && (
        <div className="modal-backdrop" role="presentation"><div className="modal upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
          <div className="modal-header"><div><span className="eyebrow">ADMINISTRADOR DE DATOS</span><h2 id="upload-title">Nueva capa</h2><p>Carga → valida → normaliza → cruza → publica.</p></div><IconButton label="Cerrar" onClick={() => setUploadOpen(false)}><X size={18}/></IconButton></div>
          <div className="stepper">{["Definición","Archivo","Validación","Mapeo","Publicación"].map((label,index) => <div className={uploadStep === index + 1 ? "active" : uploadStep > index + 1 ? "done" : ""} key={label}><i>{uploadStep > index + 1 ? <Check size={13}/> : index + 1}</i><span>{label}</span></div>)}</div>
          <div className="upload-content">
            {uploadStep === 1 && <div className="modal-form two-col"><label className="span-two"><span>Nombre de la capa</span><input placeholder="Ej. Índice municipal de vulnerabilidad"/></label><label><span>Categoría</span><select><option>Social</option><option>Técnica</option><option>Ambiental</option><option>Regulatoria</option><option>Conexión</option><option>Cliente</option></select></label><label><span>Tipo de geometría</span><select><option>Tabla municipal sin geometría</option><option>Punto</option><option>Línea</option><option>Polígono</option><option>Raster</option></select></label><label><span>Fuente</span><input placeholder="Entidad o documento"/></label><label><span>Año</span><input type="number" placeholder="2026"/></label><label><span>Escala geográfica</span><select><option>Municipal</option><option>Nacional</option><option>Departamental</option><option>Predial</option></select></label><label><span>Visibilidad</span><select><option>Oficial BOND</option><option>Pública</option><option>Privada del cliente</option><option>Temporal</option></select></label></div>}
            {uploadStep === 2 && <div><label className="dropzone"><input type="file" accept=".csv,.geojson,.json,.zip,.gpkg,.kml,.kmz,.tif,.tiff" onChange={(event) => setUploadedFile(event.target.files?.[0]?.name ?? "")}/><CloudUpload size={34}/><strong>{uploadedFile || "Arrastra o selecciona un archivo"}</strong><span>CSV, GeoJSON, Shapefile ZIP, GeoPackage, KML/KMZ o GeoTIFF</span><small>Límite configurable por organización · el original se conserva sin alterar</small></label>{uploadedFile && <div className="file-ready"><FileText size={18}/><span><strong>{uploadedFile}</strong><small>Listo para validación estructural</small></span><CheckCircle2 size={18}/></div>}</div>}
            {uploadStep === 3 && <div className="validation-view"><div className="validation-score"><CheckCircle2 size={28}/><div><span>VALIDACIÓN DE MUESTRA</span><strong>Archivo apto con observaciones</strong><p>La publicación queda bloqueada hasta resolver o aceptar los hallazgos permitidos.</p></div></div><div className="validation-grid"><div><span>Formato</span><strong><Check size={14}/> Correcto</strong></div><div><span>Codificación</span><strong><Check size={14}/> UTF-8</strong></div><div><span>Registros de muestra</span><strong>95</strong></div><div><span>DIVIPOLA reconocidos</span><strong className="green-text">92</strong></div><div><span>No reconocidos</span><strong className="red-text">3</strong></div><div><span>Duplicados</span><strong className="amber-text">2</strong></div><div><span>Valores vacíos</span><strong className="amber-text">4</strong></div><div><span>Cobertura demo</span><strong>96,8%</strong></div></div><button className="secondary-button" type="button"><Download size={15}/> Descargar errores de muestra</button></div>}
            {uploadStep === 4 && <div className="mapping-view"><div className="mapping-note"><Info size={17}/> Mapea los campos fuente al modelo BOND. Ninguna columna se interpreta silenciosamente.</div>{[['Código territorial','codigo_mpio','DIVIPOLA'],['Departamento','departamento','Texto'],['Municipio','municipio','Texto'],['Variable principal','indice_vulnerabilidad','Numérico'],['Unidad','unidad','Índice 0–1'],['Año','vigencia','Año']].map((row) => <div className="mapping-row" key={row[0]}><span>{row[0]}</span><select defaultValue={row[1]}><option>{row[1]}</option><option>No mapear</option></select><ArrowRight size={15}/><select defaultValue={row[2]}><option>{row[2]}</option><option>Texto</option><option>Numérico</option><option>Categórico</option></select></div>)}<div className="normalization-box"><label><span>Normalización</span><select><option>Min–max</option><option>Z-score</option><option>Percentiles</option><option>Manual</option><option>Binaria</option></select></label><label><span>Uso en el modelo</span><select><option>Ponderable</option><option>Informativa</option><option>Restrictiva</option><option>Bloqueante</option><option>Alerta</option></select></label><label><span>Dirección</span><select><option>Mayor valor = mayor riesgo</option><option>Mayor valor = mayor oportunidad</option></select></label></div></div>}
            {uploadStep === 5 && <div className="publish-preview"><div className="mini-map"><div className="preview-shape one"/><div className="preview-shape two"/><div className="preview-shape three"/><span>Previsualización ilustrativa</span></div><div className="publish-summary"><span className="decision-pill decision-go">LISTA PARA PUBLICAR</span><h3>Índice municipal de vulnerabilidad</h3><p>La versión conservará archivo original, mapeo, reglas aplicadas, responsable y fecha de publicación.</p><div><span>Destino</span><strong>Capas oficiales BOND</strong></div><div><span>Versión</span><strong>v1.0</strong></div><div><span>Uso</span><strong>Score social · ponderable</strong></div><div><span>Visibilidad</span><strong>Organizaciones autorizadas</strong></div></div></div>}
          </div>
          <div className="modal-footer"><button className="text-button" type="button" disabled={uploadStep === 1} onClick={() => setUploadStep((step) => Math.max(1, step - 1))}>Atrás</button><div><button className="secondary-button" type="button" onClick={() => setUploadOpen(false)}>Guardar borrador</button>{uploadStep < 5 ? <button className="primary-button" type="button" onClick={() => setUploadStep((step) => Math.min(5, step + 1))}>Continuar <ArrowRight size={16}/></button> : <button className="primary-button" type="button" onClick={() => setUploadOpen(false)}><Check size={16}/> Publicar versión</button>}</div></div>
        </div></div>
      )}
    </div>
  );
}
