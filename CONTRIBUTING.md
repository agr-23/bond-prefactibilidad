# Contribuir a BOND

## Flujo de ramas

- `main` es la rama estable. No se hace push directo ni `push --force` sobre ella.
- Cada cambio va en una rama corta creada desde `main`, con un prefijo según su tipo:
  `feat/`, `fix/`, `chore/`, `docs/` o `datos/`.
- Todo cambio entra por un pull request hacia `main`, con el CI en verde y la revisión
  del responsable del repositorio (`.github/CODEOWNERS`).
- Si `main` avanza, actualice la rama con `git rebase main` antes de pedir revisión.

## Commits

- En español, descriptivos y en imperativo: «Agregar …», «Corregir …», «Quitar …».
- Primera línea de hasta 72 caracteres; en el cuerpo, el porqué del cambio.
- Un commit por cambio lógico. No mezcle cambios de formato o de finales de línea con
  cambios de contenido.

## Antes de abrir el pull request

```sh
pnpm exec tsc --noEmit
pnpm test
pnpm lint   # hoy falla por errores preexistentes de la plataforma (issue #1)
```

Complete la plantilla del pull request y adjunte capturas si hay cambios visuales.

## Afirmaciones de producto

Los textos públicos (landing, README, documentos para clientes) solo afirman lo que existe
en el código o en `AUDITORIA_BOND.md`. Lo que es metodología u hoja de ruta se marca como
"En desarrollo" o "Próximamente".

## Datos

Los problemas en `public/data` o en su pipeline se reportan con la plantilla
"Hallazgo de datos".

## Secretos

Nunca se suben credenciales, tokens ni archivos `.env` o `.dev.vars`. El CI escanea el
historial con gitleaks en cada pull request y en cada push a `main`.
