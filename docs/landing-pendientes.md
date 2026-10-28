# Landing de BOND: pendientes

Estado al 30 de septiembre de 2026, rama `landing`. La landing vive en `/` y la
herramienta en `/plataforma`. Todo el copy está en `content/landing.ts`.

## Bloqueantes para publicar

1. **Destino del formulario.** Sin la variable `CONTACT_DESTINATION`, el
   formulario avisa que no está conectado, ofrece el correo de contacto y el
   endpoint responde 503: nunca da la solicitud por recibida. Para conectarlo:
   - `CONTACT_DESTINATION`: URL `https` de un webhook (CRM, automatización o
     correo transaccional) que recibirá cada solicitud como JSON por `POST`.
   - `CONTACT_DESTINATION_TOKEN` (opcional): se envía como
     `Authorization: Bearer …`.
   - La solicitud solo cuenta como enviada si el destino responde 2xx; si no,
     el usuario ve un error y el correo de contacto.
   - Implementación: `lib/landing/contact-delivery.ts` y `app/api/contacto/route.ts`.
2. **Política de tratamiento de datos personales** (Ley 1581 de 2012). El
   formulario pide autorización y enlaza a esa política, que aún no existe.
3. **Confirmar la afirmación 1** de la lista de abajo: la página dice que hoy
   la decisión Go / Conditional Go / No-Go la construye el equipo en la
   revisión metodológica.
4. **Pasada en Safari real** (macOS e iOS). Se probó con WebKit 26.6 de
   Playwright, pero sin GPU; conviene revisar el scroll completo, las escenas
   fijas y el movimiento reducido en dispositivos reales.

## TODO de datos

Todos están marcados con `TODO(bond)` en el código.

| Dato | Dónde | Valor provisional |
|---|---|---|
| Nombre legal | `content/landing.ts` → `org.legalName` | `[Razón social]` |
| Correo de contacto (también el `mailto:` del formulario) | `content/landing.ts` → `org.email` | `[correo@dominio.com]` |
| Ciudad | `content/landing.ts` → `org.city` | `[Ciudad]` |
| Dominio definitivo (canonical, Open Graph, JSON-LD) | `content/landing.ts` → `meta.siteUrl` | `https://www.example.com` |
| URL de la política de tratamiento de datos | `content/landing.ts` → `contact.form.consent.href` y `footer.legalLinks` | `#` |
| URL de términos de uso y de política de privacidad | `content/landing.ts` → `footer.legalLinks` | `#` |
| Destino del formulario | variables `CONTACT_DESTINATION` y `CONTACT_DESTINATION_TOKEN` | sin configurar |
| Imagen Open Graph de la landing (1200 × 630): relieve en perspectiva con el polígono cian y el titular | `public/` y `app/layout.tsx` | se usa `/og.png`, captura de la plataforma |

## Afirmaciones para validar con el equipo BOND

1. Que la decisión Go / Conditional Go / No-Go "hoy la construye el equipo
   BOND en la revisión metodológica, sobre la evidencia de la plataforma", y
   que su emisión automática está en desarrollo.
2. Las reglas de cada estado, redactadas a partir del blueprint: Go = sin
   bloqueantes y con evidencia suficiente para pasar a estudios de detalle;
   Conditional Go = riesgos mitigables con verificaciones concretas y un
   responsable; No-Go = un bloqueante crítico detiene el proyecto aunque el
   puntaje sea alto.
3. Los "Próximamente", que son compromisos de hoja de ruta: PDF ejecutivo,
   CSV del resultado, KML de salida y la dimensión económica (CAPEX preliminar
   y distancia máxima a red).
4. La clasificación de las dimensiones: técnica, conexión y global "En el
   índice"; ambiental, social, regulatoria y seguridad "Dato de contexto".
   En pantalla la plataforma muestra solo 6 indicadores por municipio; el resto
   aparece únicamente en el Excel.
5. Las cifras de alcance y del ejemplo: 1.121 polígonos municipales (catálogo
   DANE MGN 2024), 913 grupos municipales con indicadores, y el polígono de
   prueba en Antioquia (Caucasia 80,25 %, Cáceres 12,71 %, Nechí 7,04 %;
   irradiación 4,99 kWh/m²/día, redondeada de 4,9865; viento a 50 m 1,79 m/s).
6. Las descripciones institucionales: que la procedencia de la consulta previa
   la determina el Ministerio del Interior, y los textos sobre POT/PBOT/EOT,
   ANLA y corporaciones autónomas regionales, y UPME y operadores de red.
7. Los problemas de datos de la base municipal que alimenta la plataforma y el
   Excel: códigos DANE equivocados o ausentes y columnas en 0. El detalle está
   en "Hallazgos de datos del producto".

## Hallazgos de datos del producto

Estos hallazgos salen de `public/data/municipios_prefactibilidad.csv`, la base
de indicadores municipales. **Afectan a la plataforma y al Excel, no solo a la
landing**: la plataforma cruza esa base en cada análisis, el Excel exporta sus
columnas en la hoja "Municipios" y la plataforma ofrece el CSV para descargar.

- **Código de Caucasia equivocado.** La fila de Caucasia (Antioquia) tiene
  `codigo_dane` 13654; su código DANE es 05154.
- **Nechí sin código.** La fila de Nechí (Antioquia) no tiene `codigo_dane`.
- **El problema de códigos es general.** 94 de las 913 filas no tienen
  código, 147 códigos aparecen repetidos (378 distintos entre 819 filas con
  código) y 41 de las 77 filas de Antioquia llevan un código fuera del rango
  05xxx. `scripts/build_municipal_dataset.py` toma la moda de `f2_cod_dane_m`
  entre las muestras de cada municipio y la convierte a entero, lo que además
  elimina el cero inicial (05154 → 5154). Conviene revisar esa columna en la
  fuente.
- **Áreas protegidas y Ley 2.ª en 0.** `tiene_area_protegida_reportada` y
  `tiene_ley_segunda_reportada` valen 0 en los 913 registros. En el Excel esto
  se lee como "ningún municipio reporta áreas protegidas ni reservas de Ley
  2.ª", lo que es engañoso. Hipótesis: `as_flag` solo reconoce `1`, `true` o
  `sí`, y las columnas `f2_runap` y `f2_ley_segunda` de la fuente pueden venir
  en otro formato. La landing no menciona estos dos indicadores.
- **Cáceres "sin coincidencia".** La base no tiene ninguna fila de Cáceres
  (Antioquia), ni por nombre ni por su código DANE 05120. La plataforma cruza
  por departamento y nombre, así que el "sin coincidencia" se debe a esa
  ausencia; conviene revisar si la fila se perdió en el mismo proceso que
  asignó los códigos, porque tampoco aparecen los códigos reales de Caucasia
  (05154) ni de Nechí (05495).

## Otros pendientes técnicos (no bloquean)

- `pnpm lint` sigue fallando por 24 errores previos en código de la plataforma
  y del legacy (`lib/studio`, `app/studio`, `app/api/studio`,
  `app/InteractiveMap.tsx`). El código nuevo pasa lint sin errores.
- `pnpm start` (`vinext start`) no funciona en Node porque el worker importa
  `cloudflare:workers`; esto ya ocurría antes de la landing. Para probar el
  build de producción se usa `wrangler dev` (ver la sección siguiente).
- `globals.css` incluye los estilos de `/legacy` y se carga en todas las
  rutas (unos 12 KB gz). Separarlos reduciría el CSS de `/`.

## Cómo levantar y probar

```sh
pnpm install          # en Linux con libvips del sistema: SHARP_IGNORE_GLOBAL_LIBVIPS=1 pnpm install
pnpm dev              # desarrollo; la terminal indica la URL local
pnpm test             # compila y corre los tests (landing, endpoint, estilos y estudio)
pnpm build && pnpm exec wrangler dev -c dist/server/wrangler.json --local   # build de producción en workerd
```

- `/` es la landing, `/plataforma` la herramienta y `/legacy` la versión anterior.
- Para probar el formulario conectado en local, cree un archivo `.env` (ya
  está en `.gitignore`) con `CONTACT_DESTINATION=https://…` apuntando a un
  webhook de prueba. Con `wrangler dev` se pasa como
  `--var CONTACT_DESTINATION:https://…`. Sin la variable, el formulario debe
  mostrar el aviso de "no está conectado".
- Movimiento reducido: en las herramientas de desarrollo del navegador, emular
  `prefers-reduced-motion: reduce`. Las escenas deben verse en su estado final
  y la lectura no debe romperse.
