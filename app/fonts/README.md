# Fuentes

Geist y Geist Mono (SIL Open Font License 1.1, ver `OFL.txt`), tomadas del
subconjunto latino que publica Google Fonts y reducidas con fonttools:

```sh
# Geist: eje de peso limitado a 400–850, el rango que usan la landing y la plataforma
fonttools varLib.instancer geist-latin.woff2 wght=400:850 -o geist-latin-400-850.woff2
# Geist Mono: instancia fija en 400 (solo la usa la etiqueta de coordenadas de /legacy)
fonttools varLib.instancer geist-mono-latin.woff2 wght=400 -o geist-mono-latin-400.woff2
```

Geist se carga con `next/font/local` en `app/layout.tsx`. Geist Mono se declara
con `@font-face` en `app/globals.css`, sin precarga: vinext precarga en todas
las rutas cualquier fuente declarada con `next/font`.
