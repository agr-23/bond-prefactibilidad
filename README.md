# BOND

Plataforma de prefactibilidad territorial para proyectos energéticos en Colombia — EAFIT.

[![CI](https://github.com/agr-23/bond-prefactibilidad/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/agr-23/bond-prefactibilidad/actions/workflows/ci.yml)

BOND recibe un área de interés y los supuestos de un proyecto solar, eólico, híbrido, de
almacenamiento (BESS) o de autogeneración, la cruza con información territorial y entrega
evidencia trazable para decidir qué avanzar, qué verificar y qué descartar antes de invertir
en estudios, tierra, ingeniería, gestión social y permisos.

## Estado actual

Este repositorio sigue la misma regla que la landing: solo se afirma lo que existe en el
código o en [`AUDITORIA_BOND.md`](AUDITORIA_BOND.md).

### Lo que hace hoy la plataforma

- **Área de interés.** Dibujo sobre el mapa, búsqueda por municipio o código DIVIPOLA, y
  carga de GeoJSON, KML o Shapefile en ZIP. CSV, Excel y GeoTIFF (en vista muestreada) se
  cargan como capas de contexto. La geometría se valida: WGS84, sin bordes que se crucen,
  hasta 10.000 vértices y 20.000 km²; los archivos admiten hasta 20 MB y 10.000 elementos.
- **Supuestos.** Tecnología (solar FV, eólica, híbrida, BESS o autogeneración) y capacidad
  en MW.
- **Cruces.** Límites municipales del DANE (MGN 2024), con el porcentaje del área en cada
  municipio y un respaldo municipal verificado si el servicio del DANE no responde; recurso
  solar y eólico de NASA POWER en un punto del área; capas propias del usuario, marcadas
  como contexto o restricción.
- **Medición sobre el punto.** Para un área dentro de la red de EPM (Antioquia), la conexión
  se mide con los transformadores de EPM (ETER) más cercanos y su cupo de semáforo, en vez
  del promedio municipal. El acceso vial usa la vía más cercana con su tipo y la ruta en
  carro (OpenStreetMap y OSRM). Dos dimensiones de contexto nuevas: distancia a páramos,
  humedales Ramsar, reservas de Ley 2.ª y áreas protegidas (MinAmbiente / RUNAP), que se
  marca como alerta si el área intersecta alguna; y el rango de precio de la tierra rural de
  la UPRA por municipio, informativo. Cada fuente trae su origen y fecha, y degrada a
  "Sin dato" o al promedio municipal fuera de su cobertura; no inventa valores.
- **Índice técnico exploratorio.** Puntaje de 0 a 100 con recurso, proximidad a la red y
  acceso vial, ponderados por escenario, y su cobertura de evidencia. La proximidad a la red
  y el acceso vial usan la medición sobre el punto cuando está disponible, y el promedio
  municipal en caso contrario. Un dato faltante no se convierte en cero: se informa y reduce
  la cobertura.
- **Comparador** de hasta cuatro proyectos.
- **Entregables.** PDF técnico, Excel de cinco hojas y GeoJSON del área.
- **Asistente opcional** (Groq u OpenAI) que responde con los resultados del proyecto. Su
  funcionamiento con un proveedor real no está certificado en la auditoría.
- Los proyectos y las capas son privados de cada usuario.

### Metodología que aún no está en la plataforma

Según [`PRODUCT_BLUEPRINT.md`](PRODUCT_BLUEPRINT.md), la metodología incluye la decisión
Go / Conditional Go / No-Go con reglas explícitas, bloqueantes automáticos, puntajes por
cada una de las ocho dimensiones y nivel de confianza. Nada de eso está implementado todavía
en la plataforma. También están en la hoja de ruta: PDF ejecutivo, CSV del resultado, KML de
salida, GeoPackage, supuestos económicos (CAPEX preliminar, distancia máxima a red) y
colaboración de equipo con roles.

### Límites

- Es prefactibilidad exploratoria: no reemplaza la debida diligencia detallada ni los
  conceptos de las autoridades.
- La cartografía municipal está generalizada y no tiene precisión catastral.
- El recurso de NASA POWER es una referencia climatológica en un punto, no una medición en
  sitio ni la producción esperada del predio.
- Los indicadores municipales cubren 913 grupos municipales, no todo el país.

## Arquitectura

- [vinext](https://github.com/cloudflare/vinext) 0.0.50 (Next.js 16 App Router sobre
  Vite 8), React 19 y Tailwind 4, compilado como un Cloudflare Worker.
- Mapa con MapLibre GL; geoprocesamiento con Turf.

| Ruta | Qué es |
|---|---|
| `/` | Landing comercial (server components; las escenas y el formulario son client components) |
| `/plataforma` | Herramienta de prefactibilidad (estudio) |
| `/legacy` | Versión anterior de la herramienta |
| `/api/contacto` | Formulario de contacto de la landing |
| `/api/studio` | API de la herramienta: proyectos, capas, análisis y asistente |

- **Almacenamiento de la herramienta:** D1 (`DB`) y R2 (`BUCKET`), declarados en
  `.openai/hosting.json`. En desarrollo, `vite.config.ts` los simula localmente.
- **Identidad:** en el hosting actual la herramienta lee el encabezado
  `oai-authenticated-user-id`; en desarrollo local usa un usuario fijo.
- **Carpetas principales:** `app/` (rutas), `components/landing/` y `content/landing.ts`
  (landing y su copy), `lib/studio/` (motor, fuentes e informes), `lib/landing/`
  (formulario), `public/data/` (datos derivados), `scripts/`, `tests/` y `docs/`.

## Requisitos

- Node.js 22 LTS (ver `.nvmrc`; `package.json` exige 22.13 o superior).
- pnpm 10, fijado en `packageManager` (`pnpm@10.34.6`). Con Corepack: `corepack enable`.

## Desarrollo

```sh
pnpm install --frozen-lockfile
pnpm dev                    # http://localhost:3000
```

### Probar

```sh
pnpm exec tsc --noEmit      # tipos
pnpm test                   # compila y corre los tests de tests/
pnpm lint                   # hoy falla por errores preexistentes de la plataforma (issue #1)
```

### Compilar y probar el build de producción

```sh
pnpm build
pnpm exec wrangler dev -c dist/server/wrangler.json --local   # http://localhost:8787
```

`pnpm start` (`vinext start`) no sirve para esto: ejecuta el worker en Node y falla al
importar `cloudflare:workers`. `wrangler dev` lo ejecuta en workerd, como en Cloudflare.

### Notas de entorno

- **Windows:** los scripts usan la sintaxis `VARIABLE=valor comando`, que no funciona en
  PowerShell ni en cmd. Use Git Bash o WSL, o ejecute `pnpm config set shell-emulator true`.
- **Linux con libvips instalado en el sistema:** instale con
  `SHARP_IGNORE_GLOBAL_LIBVIPS=1 pnpm install` para que `sharp` use su binario precompilado.

## Variables de entorno

| Variable | Para qué | Tipo |
|---|---|---|
| `CONTACT_DESTINATION` | URL `https` del webhook que recibe las solicitudes del formulario de la landing. Sin ella, el formulario avisa que no está conectado y nunca confirma un envío. | Configuración |
| `CONTACT_DESTINATION_TOKEN` | Opcional. Se envía al webhook como `Authorization: Bearer …`. | **Secreto** |
| `AI_PROVIDER` | `groq` u `openai` para el asistente. Si no se define, usa Groq cuando hay `GROQ_API_KEY`. | Configuración |
| `GROQ_API_KEY`, `OPENAI_API_KEY` | Credencial del proveedor del asistente. | **Secreto** |
| `GROQ_MODEL`, `OPENAI_MODEL` | Modelo del asistente (opcional). | Configuración |

- **En local:** defínalas en un archivo `.env` (ignorado por git). `pnpm dev` lo lee.
- **Secretos en Cloudflare:** `wrangler secret put CONTACT_DESTINATION_TOKEN` (igual para las
  credenciales del asistente). Si el despliegue se hace desde GitHub Actions, guárdelos como
  secretos del repositorio y páselos a `wrangler secret put` desde el workflow.
- **Nunca** pase un secreto con `--var`: queda visible en el historial de la terminal, en los
  registros y en el panel como variable en texto plano. `--var` solo sirve para configuración
  no sensible, como `CONTACT_DESTINATION`.

## Datos

Los archivos de `public/data` son derivados: el dataset municipal
(`municipios_prefactibilidad.*` y `muestras_municipales_origen.geojson`), los límites
municipales del DANE MGN 2024 (`dane-municipal-display.geojson` y `municipal/*.geojson`) y
las referencias de NASA POWER. Están versionados porque la app los sirve y sus fuentes no se
regeneran en el build.

El pipeline que los produce vive por ahora fuera del repo: los scripts de `scripts/` son solo
la última etapa y leen archivos fuente que no están versionados (por ejemplo,
`build_municipal_dataset.py` lee un CSV en una ruta absoluta de otro equipo). Los hallazgos
conocidos de la base municipal se registran en issues con la etiqueta `datos`.

## Integración continua y seguridad

- **CI** (`.github/workflows/ci.yml`), en cada pull request y en cada push a `main`:
  typecheck, build y tests, y lint. El lint no es requerido mientras existan los errores
  preexistentes (issue #1); si falla, se muestra como advertencia.
- **Secretos** (`.github/workflows/secretos.yml`): gitleaks, con el binario oficial en una
  versión fijada y checksum verificado, escanea el historial en cada pull request y en `main`.
- **Dependabot** (`.github/dependabot.yml`): actualizaciones semanales de npm y de GitHub
  Actions, agrupadas.
- **CodeQL y secret scanning con push protection:** no están disponibles en el plan actual
  para este repositorio privado (la API respondió 403 y 422). Si el plan lo permite más
  adelante, actívelos en *Settings → Code security*: code scanning con la configuración por
  defecto de CodeQL (JavaScript/TypeScript) y secret scanning con push protection.
- No hay workflow de despliegue: el destino de hosting y los bloqueantes de publicación
  están pendientes.

## Documentación

- [`PRODUCT_BLUEPRINT.md`](PRODUCT_BLUEPRINT.md): producto, usuarios, módulos, scoring y
  hoja de ruta.
- [`AUDITORIA_BOND.md`](AUDITORIA_BOND.md): qué funciona hoy y cuáles son sus límites.
- [`docs/landing-pendientes.md`](docs/landing-pendientes.md): pendientes y bloqueantes para
  publicar la landing (llega con el pull request de la landing).
- [`CONTRIBUTING.md`](CONTRIBUTING.md): flujo de ramas, commits y pull requests.

## Licencia

Repositorio privado, sin licencia de código abierto. Todos los derechos reservados.
