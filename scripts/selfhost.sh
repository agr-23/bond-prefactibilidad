#!/usr/bin/env bash
# Self-host de map.dot en un servidor propio (por ejemplo un EC2).
#
# Corre la app en workerd (el mismo motor de Cloudflare), con la base D1 y el
# bucket R2 locales y persistentes. Asi funciona TODO: las demos precargadas,
# crear proyectos y analizar areas nuevas en vivo. No uses "pnpm start": ese
# ejecuta el worker en Node y falla al importar cloudflare:workers.
#
# Uso:  bash scripts/selfhost.sh
# Variables opcionales:  PORT=3000  PERSIST_DIR=.wrangler/state
#
# Requisitos en el servidor: Node 22, pnpm 10, salida a internet (las fuentes
# publicas como NASA POWER, IGAC, ANM, Overpass se consultan en cada analisis).
# Dejalo corriendo con pm2, systemd, screen o tmux para que no se caiga al salir.
set -euo pipefail
cd "$(dirname "$0")/.."

PERSIST="${PERSIST_DIR:-.wrangler/state}"
PORT="${PORT:-3000}"
WR="./node_modules/.bin/wrangler"
CFG="dist/server/wrangler.json"

echo "1/3 Build de produccion..."
SHARP_IGNORE_GLOBAL_LIBVIPS=1 pnpm build

echo "2/3 Esquema de la base D1 (idempotente)..."
if ! "$WR" d1 execute site-creator-d1 --local --persist-to "$PERSIST" -c "$CFG" \
    --command "SELECT 1 FROM studio_records LIMIT 1" >/dev/null 2>&1; then
  for f in drizzle/*.sql; do
    echo "  aplicando $f"
    "$WR" d1 execute site-creator-d1 --local --persist-to "$PERSIST" -c "$CFG" --file "$f" >/dev/null
  done
else
  echo "  la tabla ya existe, nada que aplicar"
fi

echo "3/3 Sirviendo en http://0.0.0.0:${PORT} (Ctrl+C para parar)..."
exec "$WR" dev -c "$CFG" --local --persist-to "$PERSIST" --ip 0.0.0.0 --port "$PORT"
