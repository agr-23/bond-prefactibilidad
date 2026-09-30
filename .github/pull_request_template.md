## Qué cambia

<!-- Resumen breve del cambio y del motivo. Enlace al issue si existe (por ejemplo, "Cierra #12"). -->

## Cómo se probó

<!-- Comandos, navegadores y resoluciones. -->

## Checklist

- [ ] Los tests y el typecheck pasan (`pnpm test` y `pnpm exec tsc --noEmit`, CI en verde).
- [ ] No hay afirmaciones de producto sin evidencia: todo lo que se dice que hace la plataforma existe en el código, en `AUDITORIA_BOND.md` o en datos verificables; lo demás va marcado como "Próximamente" o "En desarrollo".
- [ ] Si hay cambios visuales, se adjuntan capturas (escritorio 1440 × 960 y móvil 390 × 844).
- [ ] No se suben secretos, credenciales, archivos `.env` ni datos personales.
- [ ] Si cambian datos de `public/data`, se explica de dónde salen y cómo se regeneran.
