# BOND — Blueprint funcional del producto

## 1. Resumen ejecutivo

BOND es una plataforma SaaS de prefactibilidad territorial para proyectos energéticos en Colombia. Convierte un área de interés y unos supuestos de proyecto en una decisión preliminar trazable: **Go**, **Conditional Go** o **No-Go**. La decisión combina evidencia GIS, reglas bloqueantes, scoring multicriterio, nivel de confianza, matriz de riesgos, permisos orientativos y comparación de alternativas.

El MVP debe reducir inversión prematura en estudios, tierra, ingeniería, gestión social y permisos. No reemplaza debida diligencia detallada ni conceptos de autoridad: identifica qué avanzar, qué verificar y qué descartar.

## 2. Definición funcional

> BOND es una plataforma de prefactibilidad territorial que permite evaluar, comparar y justificar sitios para proyectos energéticos mediante análisis GIS, scoring multicriterio y reportes Go / Conditional Go / No-Go.

Entradas: área de interés, tecnología, capacidad, escala, CAPEX preliminar, distancia máxima a red, escenario y capas activas.

Procesamiento: validación espacial, intersecciones, distancias, normalización, reglas restrictivas, ponderación, confianza y explicación.

Salidas: scores por dimensión, bloqueantes, alertas, riesgos, permisos orientativos, área potencialmente aprovechable, comparación y reportes exportables.

## 3. Diferenciación frente a Transect

Transect valida una lógica valiosa: calificar o descartar sitios antes de comprometer capital; integrar ambiente, permisos, predios, área construible y sentimiento comunitario; y producir reportes accionables. Sus páginas públicas también muestran monitoreo de cambios, estimaciones de interconexión, agrupación predial y análisis para solar, eólica y BESS.

BOND adopta ese principio de decisión temprana, pero cambia el centro funcional:

| Dimensión | Benchmark observado | Diferenciación BOND |
|---|---|---|
| Decisión | Evaluación rápida de sitios | Go / Conditional Go / No-Go con regla y evidencia explícita |
| Alcance | Ambiente, permisos, comunidad, tierra | Energía integral: recurso, conexión, ambiente, sociedad, regulación, economía, seguridad y predios |
| Geografía | Datos y regulación de EE. UU. | DIVIPOLA, POT/EOT/PBOT, ANLA, CAR, UPME, OR, PDET, ZOMAC, consulta previa y gobernanza territorial |
| Método | Capas y reportes expertos | Scoring configurable por escenario, confianza y bloqueantes independientes del score |
| Datos | Datos curados y productos especializados | Backoffice GIS/CSV propio con validación, versionado, publicación y aislamiento por cliente |
| Servicio | Plataforma y marketplace | SaaS más consultoría especializada y revisión metodológica |

Fuentes de benchmark: [Transect](https://www.transect.com/), [Solar siting](https://www.transect.com/industries/solar-energy-siting), [Utilities due diligence](https://www.transect.com/industries/utilities-environmental-due-diligence-compliance-tools-transect) y [BESS siting](https://www.transect.com/industries/transect-energy-storage-siting).

## 4. Usuarios y Jobs to be Done

| Usuario | Decisión principal | Necesidad |
|---|---|---|
| Desarrollador | Avanzar o descartar | Screening veloz y comparable |
| Consultor técnico/ambiental/social | Definir estudios | Evidencia, vacíos y recomendaciones |
| Entidad pública | Priorizar territorio | Vista regional, reglas y transparencia |
| Analista GIS | Preparar análisis | Capas, geometrías, cruces y exportación |
| Inversión/estructuración | Asignar capital | Riesgos, confianza y justificación |
| Jurídico/regulatorio | Planear ruta | Disparadores y matriz de permisos |
| Cliente final | Entender resultado | Resumen ejecutivo sin jerga GIS |
| Administrador BOND | Operar plataforma | Usuarios, auditoría y configuración |
| Analista de datos | Mantener evidencia | Cargar, corregir, versionar y publicar |
| Especialista metodológico | Gobernar scoring | Pesos, umbrales, dirección y bloqueantes |
| Revisor técnico | Aprobar resultados | Trazabilidad, fuentes y control de calidad |

JTBD: conocer si iniciar un proyecto; comparar sitios; entender riesgos; cargar áreas o datos propios; anticipar permisos; justificar decisiones; evitar reprocesos; y generar un entregable para comité, cliente o inversionista.

## 5. Flujo principal

1. Login y selección de organización.
2. Crear proyecto y escoger tecnología: solar FV, eólica, híbrida, BESS, autogeneración u otra.
3. Definir escala: nacional, departamental, municipal, predial, polígono o coordenadas.
4. Buscar, dibujar o cargar AOI: KML/KMZ, GeoJSON, Shapefile ZIP, GeoPackage o coordenadas.
5. Capturar capacidad, área, horizonte, CAPEX preliminar, distancia a red y criterio dominante.
6. Elegir escenario y revisar pesos.
7. Activar capas y ejecutar validaciones/intersecciones.
8. Calcular restricciones, oportunidades, scores y confianza.
9. Revisar bloqueantes, alertas, riesgos y permisos.
10. Comparar sitios bajo reglas homogéneas.
11. Emitir Go, Conditional Go o No-Go con justificación.
12. Exportar PDF, CSV, GeoJSON/KML y mapa.

## 6. Mapa de navegación

```text
BOND
├── Portafolio
├── Explorador territorial
│   ├── Mapa nacional de oportunidades
│   └── Área / sitio seleccionado
├── Evaluaciones
│   ├── Supuestos
│   ├── Scores y confianza
│   └── Evidencia
├── Comparador de sitios
├── Riesgos
├── Permisos
├── Reportes
└── Administrador de Capas y Variables
    ├── Capas y versiones
    ├── Variables y reglas
    ├── Fuentes
    ├── Validación
    └── Auditoría
```

## 7. Módulos funcionales

| Módulo | Responsabilidad | Fase |
|---|---|---|
| Dashboard/Portafolio | Proyectos, sitios, decisiones y alertas | MVP |
| Explorador | Mapa, AOI, capas, búsqueda y herramientas | MVP |
| Evaluador | Supuestos, hallazgos, evidencia y recomendación | MVP |
| Motor multicriterio | Normalización, pesos, umbrales y confianza | MVP |
| Riesgos | Severidad, probabilidad, responsable y mitigación | MVP |
| Permisos | Requisito, disparador, entidad, etapa y estado | MVP básico / V2 avanzado |
| Social y comunitario | Comunidades, conflictividad, aceptación y presencia institucional | MVP básico / V2 |
| Técnico-energético | Recurso, topografía, accesos, red y área aprovechable | MVP |
| Ambiental | Restricciones, sensibilidad y alertas | MVP |
| Económico | CAPEX/OPEX y logística preliminar | V2 |
| Comparador | Alternativas bajo escenario homogéneo | MVP |
| Reportes | PDF, CSV, mapa y formatos GIS | MVP básico / V2 |
| Capas y Variables | Ingesta, calidad, versión, publicación y auditoría | MVP |

## 8. Wireframes textuales

| Pantalla | Objetivo / usuario | Componentes y acciones | Entrada → salida | Error / prioridad |
|---|---|---|---|---|
| Login / organización | Acceso contextual; todos | Credenciales, SSO futuro, selector de organización | Identidad → sesión y permisos | Acceso denegado; MVP |
| Dashboard | Priorizar trabajo; gerencia/analista | KPIs, proyectos, actividad, alertas | Portafolio → lista priorizada | Sin datos; MVP |
| Crear proyecto | Iniciar expediente; desarrollador | Nombre, cliente, tecnología, escala, criterio | Brief → proyecto borrador | Campos incompletos; MVP |
| Tecnología | Definir reglas; analista | Solar, eólica, híbrida, BESS, auto | Tecnología → plantilla de variables | No soportada; MVP |
| AOI | Delimitar análisis; GIS | Buscar, dibujar, cargar, editar | Geometría → AOI validada | CRS/geometría/tamaño; MVP |
| Mapa nacional | Explorar oportunidades; originación | Mapa, filtros, ranking, leyenda | Criterios → candidatos | Cobertura insuficiente; MVP |
| Sitio específico | Decidir; equipo multidisciplinario | Score, hallazgos, evidencia, alertas | AOI + escenario → decisión | Cálculo incompleto; MVP |
| Panel de capas | Controlar evidencia; GIS | Grupos, toggles, fuente, vigencia | Selección → mapa/cálculo | Capa no disponible; MVP |
| Administrador de capas | Gobernar datos; data admin | Registro, filtros, estados, versiones | Metadatos → capa gobernada | Conflicto de versión; MVP |
| CSV municipal | Incorporar tabla; data admin | Archivo, DIVIPOLA, nombre/depto | CSV → cruce municipal | Municipios no reconocidos; MVP |
| GIS upload | Incorporar geometría; GIS | Archivo, CRS, geometría, visibilidad | GIS → capa validada | Topología/CRS/Colombia; MVP |
| Validación | Diagnosticar calidad; data admin | Checklist, métricas, errores | Archivo → hallazgos | Bloqueante impide publicar; MVP |
| Mapeo | Homologar esquema; data admin | Columna, tipo, unidad, uso | Campos → variable BOND | Tipo incompatible; MVP |
| Previsualización | Aprobar resultado; revisor | Mapa, tabla, histograma, leyenda | Capa normalizada → preview | Cobertura anómala; MVP |
| Scoring | Gobernar método; metodólogo | Variables, pesos, dirección, umbrales | Configuración → versión de modelo | Pesos no suman 100%; MVP |
| Escenarios | Modelar decisiones; metodólogo | Escenarios y sensibilidad | Pesos → escenarios versionados | Regla contradictoria; MVP |
| Riesgos | Planear mitigación; PM/equipo | Riesgo, severidad, probabilidad, dueño | Hallazgo → plan | Sin responsable; MVP |
| Permisos | Anticipar gestiones; jurídico | Requisito, disparador, entidad, tiempo | Proyecto → matriz orientativa | Jurisdicción incierta; MVP básico |
| Comparador | Seleccionar alternativa; comité | Matriz, deltas, bloqueantes, ranking | Sitios → recomendación | Escenarios distintos; MVP |
| Reporte final | Comunicar decisión; cliente/comité | Plantilla, secciones, anexos | Evaluación → PDF/CSV/GIS | Fuente vencida; MVP |
| Usuarios y permisos | Control de acceso; admin | Roles, organizaciones, invitaciones | Identidad → permisos | Conflicto de alcance; MVP básico |
| Versiones | Reproducibilidad; data admin | Timeline, diff, restauración | Capa/modelo → historial | Versión en uso; V2 |
| Auditoría | Cumplimiento; admin/revisor | Actor, acción, fecha, objeto | Eventos → evidencia | Evento incompleto; V2 |

## 9. Backoffice GIS/CSV

Flujo obligatorio: **Carga → Validación → Normalización → Cruce territorial → Almacenamiento → Publicación en mapa → Uso en scoring → Reporte**.

Estados: borrador, en validación, validada, publicada, archivada. Una versión publicada es inmutable; toda corrección crea nueva versión. El archivo original se conserva en object storage con checksum. La publicación exige responsable, fuente, año, escala, cobertura, uso del modelo y reglas aplicadas.

Clases de visibilidad: oficial BOND, pública, privada por organización, temporal de análisis y archivada. Las capas privadas nunca entran en catálogos o cálculos de otra organización.

## 10. Validaciones de datos

### CSV municipal

1. Intentar cruce por DIVIPOLA.
2. Si falta, usar municipio + departamento.
3. Normalizar tildes, mayúsculas, caracteres, espacios y alias aprobados.
4. Reportar reconocidos, no reconocidos, duplicados, vacíos, atípicos y cobertura.
5. Proponer corrección, nunca autocorregir silenciosamente.
6. Permitir descargar errores y volver a cargar.

### Archivos GIS

Validar formato, tamaño, geometría, CRS, reproyección a WGS84, extensión dentro de Colombia, vacíos, duplicados, topología, cobertura, cruce municipal y tipo de uso. Un CRS desconocido, geometría corrupta o archivo malicioso bloquea. Cobertura parcial, campos vacíos o actualización antigua puede ser advertencia según regla.

## 11. Arquitectura funcional y ETL

```text
Fuentes / cliente
  → API de ingesta y carga firmada
  → object storage (original + checksum)
  → cola de procesamiento
  → validación GDAL/OGR + antivirus + esquema
  → normalización y reproyección
  → cruce DIVIPOLA / PostGIS
  → métricas de calidad + errores
  → revisión y aprobación
  → tablas versionadas PostGIS
  → vector tiles / API de consulta
  → motor de scoring
  → resultados, mapa y reportes
```

Componentes: frontend web; API backend; workers ETL; PostGIS; object storage; tabla maestra DIVIPOLA; servicio de vector tiles; motor de reglas/scoring; generador de reportes; RBAC por organización; auditoría; observabilidad.

## 12. Modelo de datos preliminar

| Entidad | Campos esenciales |
|---|---|
| organizations | id, nombre, estado, configuración |
| users / memberships | usuario, organización, rol, estado |
| projects | organización, cliente, tecnología, supuestos, estado |
| areas_of_interest | proyecto, geometría, CRS original, origen, versión |
| layers | propietario, categoría, geometría, visibilidad, estado |
| layer_versions | layer_id, archivo, checksum, esquema, cobertura, vigencia |
| variables | layer_version, unidad, tipo, dirección, uso, confianza |
| sources | entidad, URL/documento, licencia, fecha, actualización |
| validation_rules | alcance, severidad, expresión, mensaje |
| validation_runs/issues | versión, regla, resultado, detalle, resolución |
| normalization_rules | método, parámetros, rango, nulos |
| scoring_models | nombre, tecnología, versión, estado |
| scoring_scenarios | modelo, pesos, umbrales, bloqueantes |
| evaluations | proyecto, AOI, escenario, fecha, modelo, decisión |
| dimension_scores | evaluación, dimensión, score, confianza |
| findings / risks | evaluación, severidad, evidencia, mitigación, responsable |
| permit_requirements | tecnología, jurisdicción, disparador, entidad, etapa |
| reports | evaluación, plantilla, archivo, hash, fecha |
| audit_events | actor, organización, acción, objeto, antes/después, fecha |

## 13. Scoring multicriterio

Para variable normalizada `v`, peso `w` y confianza `c`:

`Score dimensión = Σ(v × w × c) / Σ(w × c)`

`Score global = Σ(score_dimensión × peso_dimensión)`

Cada variable registra unidad, método de normalización, dirección, umbrales, fuente, vigencia y confianza. Los valores faltantes no se convierten automáticamente en cero: reducen confianza o bloquean según criticidad.

Clasificación: 0,80–1,00 alta; 0,60–0,79 media; 0,40–0,59 baja; 0,00–0,39 no recomendable. Un bloqueante crítico produce No-Go aunque el agregado sea alto. Conditional Go exige riesgos mitigables, responsables y verificaciones concretas.

Dimensiones: técnica, ambiental, social, regulatoria, económica, conexión, seguridad y global.

## 14. Escenarios

| Escenario | Mayor peso | Efecto |
|---|---|---|
| Técnico | recurso, pendiente, acceso, área aprovechable | Prioriza desempeño físico |
| Ambiental | exclusiones, sensibilidad, agua, cobertura | Penaliza intervención y aumenta bloqueantes |
| Social | comunidades, consulta, conflictividad, gobernanza | Eleva verificaciones tempranas |
| Económico | logística, CAPEX/OPEX, distancia, demanda | Prioriza costo relativo |
| Regulatorio | uso de suelo, licenciamiento, servidumbres | Penaliza incertidumbre jurídica |
| Balanceado | pesos distribuidos por método aprobado | Base de comparación corporativa |
| Conservador | bloqueantes y variables de alta confianza | Favorece falsos negativos sobre falsos positivos |

## 15. Matriz de riesgos

| Riesgo | Dimensión | Señal | Respuesta | Efecto |
|---|---|---|---|---|
| Área protegida estricta | Ambiental | Intersección confirmada | Descartar/rediseñar | Bloqueante |
| Consulta previa crítica | Social | Presencia/certificación | Verificación y ruta temprana | Bloqueante o Conditional |
| Incompatibilidad normativa | Regulatoria | POT o restricción | Concepto y alternativa | Bloqueante |
| Sin conexión viable | Conexión | Umbral excedido/capacidad nula | Estudio de conexión | Bloqueante |
| Conflicto territorial | Social/seguridad | Evidencia reciente | Debida diligencia y engagement | Alto |
| Restricción hídrica | Ambiental | Cruce/proximidad | Delimitación y layout | Alto |
| Acceso logístico | Técnico/económico | Vía insuficiente | Inspección y CAPEX | Medio/alto |
| Fuente desactualizada | Datos | Vigencia vencida | Actualizar/verificar | Baja confianza |

## 16. Matriz de permisos

Campos: gestión, tecnología, jurisdicción, entidad orientativa, disparador, aplicabilidad, etapa, plazo estimado, dependencia, fuente, vigencia, responsable y estado. La matriz se genera desde reglas; el usuario confirma la aplicabilidad.

Familias iniciales: uso del suelo; licenciamiento ambiental; aprovechamiento forestal; ocupación de cauce; patrimonio/arqueología; comunidades y consulta; conexión eléctrica; servidumbres; construcción y operación; restricciones de infraestructura y seguridad.

## 17. Comparador de sitios

Requisitos: mismo escenario, versión de modelo, fecha de corte y unidad. Mostrar score global, dimensiones, confianza, bloqueantes, riesgos críticos, permisos, área potencial, distancia a red y vacíos de información. Explicar ranking y permitir sensibilidad de pesos sin sobrescribir el escenario aprobado.

## 18. Reporte exportable

PDF ejecutivo: contexto, mapa, decisión, comparación, alertas y próximos pasos.

PDF técnico: supuestos, método, versión, variables, fuentes, vigencia, scores, confianza, riesgos, permisos y anexos.

CSV: valores originales/normalizados, pesos, confianza, resultado y flags.

GeoJSON/KML: AOI, áreas excluidas, oportunidades y hallazgos permitidos por licencia.

Todo reporte incluye organización, proyecto, fecha, escenario, versión de datos/modelo, responsable, limitaciones y hash de reproducibilidad.

## 19. Roles y permisos

| Capacidad | Superadmin | Data admin | Analista BOND | Cliente admin | Cliente analista | Lectura |
|---|---:|---:|---:|---:|---:|---:|
| Gestionar organizaciones | Sí | No | No | Suya | No | No |
| Cargar capas oficiales | Sí | Sí | Proponer | No | No | No |
| Publicar/versionar | Sí | Sí | No | Privadas propias | No | No |
| Configurar scoring | Sí | Proponer | Proponer | No | No | No |
| Crear proyectos/AOI | Sí | Sí | Sí | Sí | Sí | No |
| Evaluar/comparar | Sí | Sí | Sí | Sí | Sí | Ver |
| Exportar | Sí | Sí | Sí | Sí | Según política | Según política |
| Gestionar usuarios | Sí | No | No | Su organización | No | No |
| Ver auditoría | Sí | Datos | Proyecto | Su organización | No | No |

## 20. Priorización

MVP: login; organizaciones; proyectos; AOI; mapa y capas; CSV municipal; GIS básico; validación; cruce DIVIPOLA; scoring base; riesgos; comparación; PDF básico; roles; administrador de capas.

V2: GeoPackage/GeoTIFF; versiones avanzadas; scoring por cliente; permisos avanzados; economía preliminar; alertas; GeoJSON/KML; auditoría; capas privadas; vacíos de datos.

V3: IA asistiva con evidencia; monitoreo regulatorio/social; APIs; datos dinámicos; marketplace; modelos predictivos; reportes avanzados; simulación financiera; portafolio nacional/regional.

## 21. Recomendaciones visuales para Figma

- Interfaz operativa densa, tranquila y cartográfica; mapa como superficie principal.
- Navegación lateral persistente y cabecera contextual.
- Verde para viabilidad, ámbar para condicional y rojo solo para bloqueantes/alto riesgo.
- Scores acompañados de evidencia y confianza; nunca usar color como única señal.
- Tablas para comparación, riesgos, permisos, capas y auditoría.
- Panel lateral de evaluación con resumen, dimensiones, alertas y siguiente acción.
- Componentes base: botón, icon button, select, segmented control, status pill, data table, layer toggle, score bar, alert, modal, stepper, map legend y evidence drawer.
- Desktop primero para GIS; adaptación móvil para consulta y aprobación, no edición cartográfica avanzada.

## 22. Supuestos, limitaciones y datos pendientes

- Las fuentes reales, licencias, cobertura, frecuencia y autoridad se deben inventariar y aprobar.
- DIVIPOLA requiere tabla maestra versionada y política de cambios históricos.
- La disponibilidad de capacidad de conexión no se asume; puede requerir acuerdos o estudios.
- Consulta previa, aceptación comunitaria y seguridad no deben reducirse a un único indicador automático.
- El prototipo usa datos demostrativos y no soporta decisiones reales.
- Se requiere definición jurídica de privacidad, retención, exportación y propiedad de capas del cliente.
- Falta calibrar pesos, umbrales y bloqueantes con expertos y casos históricos.
- Falta acordar SLA, tamaños máximos, concurrencia y costos de procesamiento geoespacial.

## 23. Estrategia para reducir consumo de tokens

1. Mantener un contexto base de una página con objetivo, decisiones y glosario.
2. Trabajar un módulo por conversación: scoring, backoffice, permisos, etc.
3. No pegar archivos completos; enviar ruta, función y fragmento relevante.
4. Usar muestras de 10–30 filas y esquemas de columnas para datos.
5. Pedir primero estructura y criterios; detallar solo lo aprobado.
6. Fijar tablas y contratos de salida para evitar reformateos.
7. Referenciar decisiones previas por ID y versión, sin repetir el brief.
8. Solicitar límites de palabras, filas o secciones.
9. Usar prompt caching por API para metodología, glosario y reglas estables.
10. Resumir cada módulo terminado en un registro corto de decisiones.
