/**
 * Copy de la landing comercial de BOND (es-CO, trato de "usted").
 *
 * Todo el texto visible de "/" vive aquí para poder editarlo sin tocar JSX.
 * Regla de honestidad: solo se afirma lo que existe en el código de la
 * plataforma o en AUDITORIA_BOND.md. Lo que aún no existe se marca con una
 * de las etiquetas de `statusLabels` y nunca se presenta como disponible.
 *
 * Los marcadores `TODO(bond)` requieren datos del equipo antes de publicar.
 */

/** Etiquetas de estado. Cada una significa lo mismo en toda la página. */
export type StatusKey = "indice" | "contexto" | "proximamente" | "disponible" | "desarrollo";

/** Las dimensiones usan exactamente tres estados. */
export type DimensionStatus = Extract<StatusKey, "indice" | "contexto" | "proximamente">;

export interface StatusInfo {
  label: string;
  meaning: string;
}

export interface LinkItem {
  label: string;
  href: string;
}

export interface SectionIntro {
  /** Ancla de la sección (sin #). */
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
}

export interface Step {
  title: string;
  body: string;
  detail: string;
  /** Capacidad del método que la plataforma aún no automatiza. */
  pending?: { status: StatusKey; text: string };
}

export interface Dimension {
  id: string;
  name: string;
  status: DimensionStatus;
  line: string;
}

export interface DecisionState {
  id: "go" | "conditional" | "nogo";
  name: string;
  rule: string;
}

export interface ExampleShare {
  name: string;
  share: number;
  /** El municipio no tiene coincidencia en la base de indicadores BOND. */
  missing?: boolean;
}

export interface ExampleReading {
  label: string;
  value: number;
  decimals: number;
  unit: string;
}

export interface Technology {
  name: string;
  resource: string;
  line: string;
}

export interface ColombiaItem {
  name: string;
  line: string;
  status?: StatusKey;
}

export interface Deliverable {
  name: string;
  format: string;
  status: Extract<StatusKey, "disponible" | "proximamente">;
  line: string;
}

export interface Audience {
  role: string;
  decision: string;
  line: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FieldCopy {
  label: string;
  hint?: string;
  placeholder?: string;
}

export interface LandingContent {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    siteUrl: string;
    locale: string;
  };
  org: {
    name: string;
    legalName: string;
    email: string;
    city: string;
    country: string;
    description: string;
  };
  statusLabels: Record<StatusKey, StatusInfo>;
  nav: {
    brand: string;
    homeLabel: string;
    skipLink: string;
    links: LinkItem[];
    cta: LinkItem;
    platform: LinkItem;
    ariaLabel: string;
    openMenu: string;
    closeMenu: string;
  };
  hero: {
    eyebrow: string;
    titleLines: string[];
    lead: string;
    primaryCta: LinkItem;
    secondaryCta: LinkItem;
  };
  problem: SectionIntro & {
    costs: { name: string; line: string }[];
    closing: string;
  };
  howItWorks: SectionIntro & {
    stepLabel: string;
    steps: Step[];
    stage: {
      technologyLabel: string;
      technologies: string[];
      capacity: string;
      layersTitle: string;
      layers: string[];
      index: { title: string; criteria: string[]; coverage: string };
      result: {
        title: string;
        rows: string[];
        decisionTitle: string;
      };
    };
  };
  dimensions: SectionIntro & {
    legendTitle: string;
    items: Dimension[];
    mergedCaption: string;
  };
  decision: SectionIntro & {
    statesTitle: string;
    states: DecisionState[];
    automation: { status: StatusKey; text: string };
    example: {
      label: string;
      title: string;
      intro: string;
      sharesTitle: string;
      shares: ExampleShare[];
      missingTag: string;
      readingsTitle: string;
      readings: ExampleReading[];
      missingNote: string;
      footnote: string;
    };
  };
  technologies: SectionIntro & {
    items: Technology[];
  };
  colombia: SectionIntro & {
    figures: { value: string; caption: string }[];
    todayTitle: string;
    today: ColombiaItem[];
    verifyTitle: string;
    verifyNote: string;
    verify: ColombiaItem[];
  };
  deliverables: SectionIntro & {
    items: Deliverable[];
  };
  audiences: SectionIntro & {
    items: Audience[];
  };
  transparency: SectionIntro & {
    isTitle: string;
    is: string[];
    isNotTitle: string;
    isNot: string[];
    coverage: string;
    legendTitle: string;
    closing: string;
  };
  faq: SectionIntro & {
    items: FaqItem[];
  };
  contact: SectionIntro & {
    form: {
      name: FieldCopy;
      organization: FieldCopy;
      email: FieldCopy;
      role: FieldCopy & { options: string[] };
      technology: FieldCopy & { options: string[] };
      location: FieldCopy;
      message: FieldCopy;
      consent: { label: string; linkLabel: string; href: string };
      honeypot: string;
      optional: string;
      submit: string;
      sending: string;
      /** Solo se muestra si el destino confirmó la entrega. */
      success: { title: string; body: string };
      /** Aviso visible mientras no haya un destino configurado (CONTACT_DESTINATION). */
      notConnected: string;
      notSent: string;
      failure: string;
      writeUs: string;
      invalid: string;
      errors: {
        required: string;
        email: string;
        option: string;
        consent: string;
        tooShort: string;
        tooLong: string;
      };
    };
  };
  footer: {
    tagline: string;
    legalLinks: LinkItem[];
    disclaimer: string;
    rights: string;
  };
}

// TODO(bond): reemplazar por los datos legales y de contacto definitivos.
const org: LandingContent["org"] = {
  name: "BOND",
  legalName: "[Razón social]", // TODO(bond): nombre legal
  email: "[correo@dominio.com]", // TODO(bond): correo de contacto
  city: "[Ciudad]", // TODO(bond): ciudad
  country: "Colombia",
  description:
    "Plataforma de prefactibilidad territorial para proyectos energéticos en Colombia.",
};

export const landing: LandingContent = {
  meta: {
    title: "BOND | Prefactibilidad territorial energética en Colombia",
    description:
      "Cruce su área de interés con la cartografía municipal oficial, el recurso solar y eólico y datos de contexto. Evidencia trazable antes de comprometer capital.",
    ogTitle: "BOND · Conozca su terreno antes de comprometer capital",
    ogDescription:
      "Prefactibilidad territorial para proyectos energéticos en Colombia, con evidencia trazable y límites declarados.",
    siteUrl: "https://www.example.com", // TODO(bond): dominio definitivo (canonical, Open Graph y JSON-LD)
    locale: "es_CO",
  },

  org,

  statusLabels: {
    indice: {
      label: "En el índice",
      meaning: "Hoy entra al índice técnico exploratorio de la plataforma.",
    },
    contexto: {
      label: "Dato de contexto",
      meaning:
        "La plataforma lo reporta hoy a escala municipal, en pantalla o en el Excel, sin ponderarlo en el índice.",
    },
    proximamente: {
      label: "Próximamente",
      meaning: "Previsto en la hoja de ruta. Hoy no está disponible.",
    },
    disponible: {
      label: "Disponible",
      meaning: "Se obtiene hoy desde la plataforma.",
    },
    desarrollo: {
      label: "En desarrollo",
      meaning:
        "Parte del método BOND que hoy aplica el equipo en la revisión metodológica y que la plataforma aún no automatiza.",
    },
  },

  nav: {
    brand: "BOND",
    homeLabel: "BOND, inicio",
    skipLink: "Saltar al contenido",
    links: [
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Qué evaluamos", href: "#que-evaluamos" },
      { label: "Colombia", href: "#colombia" },
      { label: "Entregables", href: "#entregables" },
      { label: "Transparencia", href: "#transparencia" },
      { label: "Preguntas", href: "#preguntas" },
    ],
    cta: { label: "Solicitar evaluación", href: "#contacto" },
    platform: { label: "Ingresar a la plataforma", href: "/plataforma" },
    ariaLabel: "Navegación principal",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
  },

  hero: {
    eyebrow: "Prefactibilidad territorial para proyectos energéticos en Colombia",
    titleLines: ["Conozca su terreno", "antes de comprometer capital."],
    lead:
      "BOND cruza su área con la cartografía municipal oficial, el recurso solar y eólico y datos de contexto, y le muestra la evidencia detrás de cada cifra. Usted decide qué avanzar, qué verificar y qué descartar.",
    primaryCta: { label: "Solicitar evaluación", href: "#contacto" },
    secondaryCta: { label: "Ver cómo funciona", href: "#como-funciona" },
  },

  problem: {
    id: "problema",
    eyebrow: "El problema",
    title: "Un bloqueante descubierto tarde cuesta caro.",
    lead:
      "Antes de saber si un terreno es viable, un proyecto puede haber comprometido presupuesto en cinco frentes.",
    costs: [
      {
        name: "Estudios",
        line: "Topografía, recurso, suelos y caracterizaciones sobre un área que quizá no avance.",
      },
      { name: "Tierra", line: "Opciones, arriendos y negociaciones con propietarios." },
      {
        name: "Ingeniería",
        line: "Diseños y distribuciones de planta sobre restricciones que aún no se conocían.",
      },
      {
        name: "Gestión social",
        line: "Relacionamiento y expectativas en las comunidades del área.",
      },
      {
        name: "Permisos",
        line: "Trámites iniciados ante autoridades para un proyecto que no podía avanzar.",
      },
    ],
    closing:
      "BOND pone la evidencia territorial al principio, cuando cambiar de terreno todavía es barato.",
  },

  howItWorks: {
    id: "como-funciona",
    eyebrow: "Cómo funciona",
    title: "Del polígono a la evidencia.",
    lead:
      "Así trabaja hoy la plataforma. Cada paso deja rastro: qué se cruzó, con qué fuente y con qué resultado.",
    stepLabel: "Paso",
    steps: [
      {
        title: "Defina el área",
        body:
          "Dibuje el polígono sobre el mapa, busque un municipio por nombre o código DIVIPOLA, o cargue un archivo GeoJSON, KML o Shapefile ZIP.",
        detail:
          "Antes de analizar, BOND valida la geometría: coordenadas WGS84, sin bordes que se crucen, hasta 10.000 vértices y 20.000 km².",
      },
      {
        title: "Indique los supuestos",
        body:
          "Elija la tecnología —solar FV, eólica, híbrida, BESS o autogeneración— y la capacidad en MW.",
        detail:
          "La tecnología define qué recurso entra al índice: irradiación, viento a 50 m, ambos o ninguno, en el caso de BESS.",
      },
      {
        title: "Cruce el territorio",
        body:
          "El área se cruza con los límites municipales del DANE (MGN 2024) y se calcula qué porcentaje cae en cada municipio. Se consulta el recurso de NASA POWER y se cruzan las capas propias que usted cargue.",
        detail:
          "Si el servicio del DANE no responde, BOND usa un respaldo municipal verificado e indica su precisión.",
      },
      {
        title: "Calcule el índice",
        body:
          "Recurso, distancia a subestación y acceso vial se normalizan y ponderan en un índice técnico exploratorio de 0 a 100, con su cobertura de evidencia.",
        detail: "Un dato faltante no se convierte en cero: se informa y reduce la cobertura.",
        pending: {
          status: "desarrollo",
          text: "Puntajes por dimensión, bloqueantes automáticos y nivel de confianza.",
        },
      },
      {
        title: "Decida con evidencia",
        body:
          "La plataforma entrega el índice, la cobertura, los municipios cruzados y sus fuentes en PDF técnico, Excel y GeoJSON.",
        detail:
          "La decisión Go, Conditional Go o No-Go se construye con el equipo BOND en la revisión metodológica.",
        pending: {
          status: "desarrollo",
          text: "Emisión automática de la decisión.",
        },
      },
    ],
    stage: {
      technologyLabel: "Tecnología",
      technologies: ["Solar FV", "Eólica", "Híbrida", "BESS", "Autogeneración"],
      capacity: "Capacidad · MW",
      layersTitle: "Capas cruzadas",
      layers: [
        "Límites municipales · DANE",
        "Recurso · NASA POWER",
        "Indicadores municipales · BOND",
        "Capas propias",
      ],
      index: {
        title: "Índice técnico exploratorio",
        criteria: ["Recurso", "Distancia a subestación", "Acceso vial"],
        coverage: "Cobertura de evidencia",
      },
      result: {
        title: "Lo que entrega hoy",
        rows: ["Índice técnico exploratorio", "Cobertura de evidencia", "Municipios cruzados"],
        decisionTitle: "Decisión metodológica",
      },
    },
  },

  dimensions: {
    id: "que-evaluamos",
    eyebrow: "Qué evaluamos",
    title: "Ocho dimensiones sobre el mismo territorio.",
    lead:
      "La metodología BOND lee el territorio en ocho dimensiones. Cada una indica qué hace hoy la plataforma con ella.",
    legendTitle: "Qué significa cada etiqueta",
    items: [
      {
        id: "tecnica",
        name: "Técnica",
        status: "indice",
        line: "Recurso solar o eólico según la tecnología, y distancia a la vía principal.",
      },
      {
        id: "conexion",
        name: "Conexión",
        status: "indice",
        line: "Distancia a la subestación más cercana, como aproximación a la red. La capacidad disponible no se asume.",
      },
      {
        id: "ambiental",
        name: "Ambiental",
        status: "contexto",
        line: "Cercanía a ríos y cuencas y lluvia media, a escala municipal. Sus capas ambientales propias se cruzan con el área.",
      },
      {
        id: "social",
        name: "Social",
        status: "contexto",
        line: "Resguardos reportados, densidad de población, pobreza energética y cobertura eléctrica.",
      },
      {
        id: "regulatoria",
        name: "Regulatoria",
        status: "contexto",
        line: "Municipios PDET, ZOMAC y zonas no interconectadas, y vocación predominante del suelo.",
      },
      {
        id: "seguridad",
        name: "Seguridad",
        status: "contexto",
        line: "Registros de conflictividad y de cultivos de coca a escala municipal, sin reducirlos a una sola cifra.",
      },
      {
        id: "economica",
        name: "Económica",
        status: "proximamente",
        line: "CAPEX preliminar y distancia máxima a red como supuestos del proyecto.",
      },
      {
        id: "global",
        name: "Global",
        status: "indice",
        line: "El índice técnico exploratorio de 0 a 100 y su cobertura de evidencia. El agregado de las ocho dimensiones está en desarrollo.",
      },
    ],
    mergedCaption: "Una sola lectura: qué avanzar, qué verificar y qué descartar.",
  },

  decision: {
    id: "decision",
    eyebrow: "La decisión",
    title: "Una decisión que se puede explicar.",
    lead:
      "La metodología BOND expresa la prefactibilidad en tres estados. Cada uno declara la regla que lo produce y la evidencia que lo sostiene.",
    statesTitle: "Tres estados, una regla cada uno",
    states: [
      {
        id: "go",
        name: "Go",
        rule: "Sin bloqueantes y con evidencia suficiente para pasar a estudios de detalle.",
      },
      {
        id: "conditional",
        name: "Conditional Go",
        rule: "Riesgos mitigables, con verificaciones concretas y un responsable para cada una.",
      },
      {
        id: "nogo",
        name: "No-Go",
        rule: "Un bloqueante crítico detiene el proyecto, aunque el puntaje sea alto.",
      },
    ],
    automation: {
      status: "desarrollo",
      text: "Hoy esta decisión la construye el equipo BOND en la revisión metodológica, sobre la evidencia de la plataforma. Su emisión automática está en desarrollo.",
    },
    example: {
      label: "Ejemplo ilustrativo de una prueba interna",
      title: "Polígono de prueba en Antioquia",
      intro: "Lo que entregó la plataforma, sin asignarle una decisión.",
      sharesTitle: "Área por municipio · DANE MGN 2024",
      shares: [
        { name: "Caucasia", share: 80.25 },
        { name: "Cáceres", share: 12.71, missing: true },
        { name: "Nechí", share: 7.04 },
      ],
      missingTag: "Sin dato en la base",
      readingsTitle: "Recurso en el punto consultado · NASA POWER",
      readings: [
        { label: "Irradiación solar", value: 4.99, decimals: 2, unit: "kWh/m²/día" },
        { label: "Viento a 50 m", value: 1.79, decimals: 2, unit: "m/s" },
      ],
      missingNote: "Cuando la base no tiene dato, BOND lo informa en vez de estimarlo.",
      footnote:
        "Resultado de una prueba interna de la plataforma. No es una evaluación de ese territorio.",
    },
  },

  technologies: {
    id: "tecnologias",
    eyebrow: "Tecnologías",
    title: "Una lectura para cada tecnología.",
    lead: "La tecnología que usted elige cambia el recurso que entra al índice.",
    items: [
      {
        name: "Solar FV",
        resource: "Irradiación",
        line: "Irradiación solar de NASA POWER como recurso del índice.",
      },
      {
        name: "Eólica",
        resource: "Viento a 50 m",
        line: "Velocidad del viento a 50 m. Es una referencia climatológica, no una medición en sitio.",
      },
      {
        name: "Híbrida",
        resource: "Solar + viento",
        line: "Promedio de los puntajes solar y eólico.",
      },
      {
        name: "BESS",
        resource: "Red y acceso",
        line: "Sin recurso renovable: el índice se apoya en red y acceso, sin reducir la cobertura de evidencia.",
      },
      {
        // \u00AD: guion blando; solo aparece si la palabra no cabe en su columna.
        name: "Autogene\u00ADración",
        resource: "Irradiación",
        line: "Recurso solar como referencia inicial, con las zonas no interconectadas como dato de contexto.",
      },
    ],
  },

  colombia: {
    id: "colombia",
    eyebrow: "Hecho para Colombia",
    title: "Hecho para el territorio colombiano.",
    lead:
      "El método parte de cómo se ordena y se regula el territorio en Colombia. Esto es lo que la plataforma cruza hoy y lo que cada proyecto debe verificar.",
    figures: [
      {
        value: "1.121",
        caption: "polígonos municipales del DANE (MGN 2024) en el catálogo de la plataforma.",
      },
      {
        value: "913",
        caption: "grupos municipales con indicadores en la base BOND. No cubre todo el país.",
      },
    ],
    todayTitle: "Lo que la plataforma cruza hoy",
    today: [
      {
        name: "DIVIPOLA y MGN 2024",
        status: "disponible",
        line: "Su área se cruza con los polígonos municipales oficiales del DANE, y cada resultado queda anclado al código del municipio.",
      },
      {
        name: "PDET, ZOMAC y zonas no interconectadas",
        status: "contexto",
        line: "Indica si el municipio está priorizado en la política de desarrollo territorial y posconflicto, o si está fuera del sistema interconectado.",
      },
      {
        name: "Resguardos reportados",
        status: "contexto",
        line: "Presencia reportada a escala municipal. Anticipa conversaciones; no determina la consulta previa.",
      },
    ],
    verifyTitle: "Lo que cada proyecto debe verificar",
    verifyNote:
      "La plataforma no cruza hoy estas fuentes. Cada análisis deja constancia de que el uso del suelo, las restricciones oficiales, la capacidad de conexión y la evaluación social requieren validación.",
    verify: [
      {
        name: "POT, PBOT y EOT",
        line: "El ordenamiento de cada municipio define si el uso del suelo es compatible con el proyecto.",
      },
      {
        name: "ANLA y corporaciones autónomas regionales",
        line: "Licenciamiento y permisos ambientales, según la escala del proyecto y la jurisdicción.",
      },
      {
        name: "UPME y operadores de red",
        line: "La ruta de conexión al sistema. BOND usa la distancia a subestación como aproximación; la capacidad disponible no se asume.",
      },
      {
        name: "Consulta previa",
        line: "Su procedencia la determina el Ministerio del Interior. BOND no la reduce a un indicador automático.",
      },
    ],
  },

  deliverables: {
    id: "entregables",
    eyebrow: "Entregables",
    title: "Evidencia lista para su comité.",
    lead:
      "Descargue el resultado en formatos que su equipo ya usa. El PDF y el Excel incluyen fuentes, reglas y limitaciones.",
    items: [
      {
        name: "PDF técnico",
        format: "PDF",
        status: "disponible",
        line: "Mapa del área, municipios cruzados, recurso, índice con sus reglas, hallazgos y fuentes.",
      },
      {
        name: "Excel",
        format: "XLSX",
        status: "disponible",
        line: "Cinco hojas: proyecto, municipios con sus indicadores, recurso mensual, fuentes y limitaciones, y escenario de pesos.",
      },
      {
        name: "GeoJSON",
        format: "GeoJSON",
        status: "disponible",
        line: "El polígono del área de estudio, listo para cualquier SIG.",
      },
      {
        name: "PDF ejecutivo",
        format: "PDF",
        status: "proximamente",
        line: "Resumen para comité: contexto, decisión y próximos pasos, sin jerga GIS.",
      },
      {
        name: "CSV del resultado",
        format: "CSV",
        status: "proximamente",
        line: "Valores originales y normalizados, pesos y cobertura en una tabla plana.",
      },
      {
        name: "KML de salida",
        format: "KML",
        status: "proximamente",
        line: "Área y hallazgos para visores cartográficos.",
      },
    ],
  },

  audiences: {
    id: "para-quien",
    eyebrow: "Para quién",
    title: "Para quien decide sobre el territorio.",
    items: [
      {
        role: "Desarrolladores de proyectos",
        decision: "Avanzar o descartar un terreno.",
        line: "Solar, eólico, híbrido o BESS: una primera lectura comparable antes de negociar tierra o contratar estudios.",
      },
      {
        role: "Consultores técnicos, ambientales y sociales",
        decision: "Definir qué estudios hacen falta.",
        line: "Evidencia, vacíos de información y fuentes para dimensionar el alcance.",
      },
      {
        role: "Inversión y estructuración",
        decision: "Decidir dónde asignar capital.",
        line: "Evidencia trazable, cobertura declarada y limitaciones explícitas para el comité.",
      },
      {
        role: "Entidades públicas",
        decision: "Priorizar territorio.",
        line: "Una lectura municipal con reglas y fuentes a la vista.",
      },
      {
        role: "Analistas GIS",
        decision: "Preparar el análisis.",
        line: "Validación de geometrías, cruces municipales y exportación en formatos abiertos.",
      },
    ],
  },

  transparency: {
    id: "transparencia",
    eyebrow: "Transparencia metodológica",
    title: "Lo que BOND es. Y lo que no.",
    isTitle: "BOND es",
    is: [
      "Prefactibilidad exploratoria: una primera lectura del territorio para ordenar qué avanzar, qué verificar y qué descartar.",
      "Evidencia trazable: cada cifra con su fuente, su escala y su fecha.",
      "Un método explícito: pesos, rangos y reglas a la vista en cada reporte.",
    ],
    isNotTitle: "BOND no es",
    isNot: [
      "Un reemplazo de la debida diligencia detallada ni de los conceptos de las autoridades.",
      "Cartografía con precisión catastral. Los límites municipales están generalizados, y un proyecto sobre el límite entre municipios requiere cartografía detallada y validación oficial.",
      "Un indicador automático de consulta previa, aceptación comunitaria o seguridad. Esos temas no se reducen a una cifra.",
      "Una medición en campo. El recurso de NASA POWER es una referencia climatológica en un punto, no la producción esperada del predio.",
      "Una máquina que decide por usted. Organiza la evidencia para que su equipo decida.",
    ],
    coverage:
      "Los indicadores municipales cubren 913 grupos municipales, no todo el país. Cuando no hay dato, se informa.",
    legendTitle: "Cómo leer las etiquetas de esta página",
    closing: "Declarar los límites también es parte del método.",
  },

  faq: {
    id: "preguntas",
    eyebrow: "Preguntas frecuentes",
    title: "Lo que suelen preguntarnos.",
    items: [
      {
        question: "¿BOND reemplaza los estudios de detalle?",
        answer:
          "No. BOND es prefactibilidad exploratoria: ayuda a decidir dónde vale la pena invertir en estudios. La debida diligencia detallada y los conceptos de las autoridades siguen siendo necesarios.",
      },
      {
        question: "¿Qué archivos puedo cargar?",
        answer:
          "Para definir el área: GeoJSON, KML o Shapefile en ZIP. Como capas de contexto también se aceptan CSV, Excel y GeoTIFF, este último en una vista muestreada. Cada archivo admite hasta 20 MB y 10.000 elementos.",
      },
      {
        question: "¿De dónde vienen los datos?",
        answer:
          "Límites municipales del DANE (MGN 2024), recurso solar y eólico de NASA POWER, la base de indicadores municipales de BOND y las capas que usted cargue. Cada resultado cita su fuente.",
      },
      {
        question: "¿Qué pasa si un municipio no tiene datos?",
        answer:
          "Se informa como dato faltante y no se estima. El índice se calcula con los criterios disponibles y la cobertura de evidencia lo refleja.",
      },
      {
        question: "¿Cómo se llega a Go, Conditional Go o No-Go?",
        answer:
          "Es la metodología de BOND: un bloqueante crítico produce No-Go aunque el puntaje sea alto, y un Conditional Go exige verificaciones concretas con un responsable. Hoy la decisión la construye el equipo en la revisión metodológica, sobre la evidencia de la plataforma; su emisión automática está en desarrollo.",
      },
      {
        question: "¿Qué tan precisa es la cartografía?",
        answer:
          "El respaldo municipal tiene una generalización cercana a seis metros, y la vista del mapa está más generalizada. No es una tolerancia legal: los proyectos sobre límites entre municipios necesitan cartografía detallada y validación oficial.",
      },
      {
        question: "¿Quién puede ver mis proyectos?",
        answer:
          "Sus proyectos y capas son privados de su usuario. La colaboración de equipo con roles compartidos aún no está disponible.",
      },
      {
        question: "¿Cómo empiezo?",
        answer:
          "Escríbanos con el formulario: la ubicación aproximada, la tecnología y lo que necesita decidir. Si su organización ya tiene acceso, ingrese a la plataforma.",
      },
    ],
  },

  contact: {
    id: "contacto",
    eyebrow: "Contacto",
    title: "Empiece por un polígono.",
    lead: "Cuéntenos dónde está su terreno, qué quiere construir y qué necesita decidir.",
    form: {
      name: { label: "Nombre" },
      organization: { label: "Organización" },
      email: { label: "Correo electrónico", placeholder: "nombre@empresa.com" },
      role: {
        label: "Rol",
        placeholder: "Seleccione su perfil",
        options: [
          "Desarrollador de proyectos",
          "Consultor técnico, ambiental o social",
          "Inversión y estructuración",
          "Entidad pública",
          "Analista GIS",
          "Otro",
        ],
      },
      technology: {
        label: "Tecnología de interés",
        placeholder: "Seleccione una tecnología",
        options: ["Solar FV", "Eólica", "Híbrida", "BESS", "Autogeneración", "Aún no definida"],
      },
      location: {
        label: "Ubicación aproximada o municipio",
        hint: "Opcional. Por ejemplo, el municipio y su departamento; no hace falta enviar coordenadas.",
      },
      message: { label: "Mensaje", hint: "Qué necesita decidir y en qué plazo." },
      consent: {
        label: "Autorizo el tratamiento de mis datos personales para responder esta solicitud, según la",
        linkLabel: "política de tratamiento de datos",
        href: "#", // TODO(bond): URL de la política de tratamiento de datos personales (Ley 1581 de 2012)
      },
      honeypot: "Deje este campo vacío",
      optional: "(opcional)",
      submit: "Enviar solicitud",
      sending: "Enviando…",
      success: {
        title: "Solicitud enviada.",
        body: "Gracias. Le escribiremos al correo que indicó.",
      },
      notConnected:
        "El formulario todavía no está conectado: por ahora las solicitudes no se guardan ni se envían.",
      notSent: "Su solicitud no se envió: el formulario todavía no está conectado.",
      failure: "No pudimos enviar su solicitud. Inténtelo de nuevo en unos minutos.",
      writeUs: "Escríbanos a",
      invalid: "Revise los campos marcados.",
      errors: {
        required: "Este campo es obligatorio.",
        email: "Escriba un correo válido, por ejemplo nombre@empresa.com.",
        option: "Seleccione una opción de la lista.",
        consent: "Necesitamos su autorización para responderle.",
        tooShort: "Escriba al menos {n} caracteres.",
        tooLong: "Use como máximo {n} caracteres.",
      },
    },
  },

  footer: {
    tagline: "Prefactibilidad territorial para proyectos energéticos en Colombia.",
    legalLinks: [
      { label: "Términos de uso", href: "#" }, // TODO(bond): URL de términos de uso
      { label: "Política de privacidad", href: "#" }, // TODO(bond): URL de política de privacidad
      { label: "Tratamiento de datos personales", href: "#" }, // TODO(bond): URL de la política de datos
    ],
    disclaimer:
      "BOND cita al DANE, NASA POWER, la ANLA, las CAR, la UPME y otras entidades como fuentes o marco normativo. Eso no implica afiliación ni respaldo.",
    rights: "Todos los derechos reservados.",
  },
};
