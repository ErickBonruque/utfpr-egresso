#!/usr/bin/env bash
# Backup do Postgres do CEA (Fase 9).
#
# Uso:
#   ./scripts/backup.sh                 # usa a DATABASE_URL do app/.env
#   DATABASE_URL=... ./scripts/backup.sh
#   ./scripts/backup.sh /caminho/destino
#
# Formato custom do pg_dump (-Fc): comprimido, restaurável seletivamente e
# independente da versão do texto SQL. O arquivo carrega a data no nome —
# sobrescrever backup é como não ter backup.
#
# As ferramentas rodam dentro da mesma imagem do banco (postgres:17-alpine),
# não com o pg_dump da máquina: um cliente mais antigo que o servidor recusa
# o dump ("server version mismatch"), e é exatamente esse o caso aqui.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
  fi
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "erro: DATABASE_URL não definida (nem no ambiente, nem em app/.env)" >&2
  exit 1
fi

DEST_DIR="${1:-backups}"
mkdir -p "$DEST_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST_DIR/cea-$STAMP.dump"

echo "Gerando backup em $OUT ..."
docker run --rm --network host -e PGCONNECT_TIMEOUT=10 postgres:17-alpine \
  pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" >"$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "OK — $OUT ($SIZE)"
echo
echo "Confira o conteúdo antes de confiar nele:"
echo "  ./scripts/restore.sh $OUT postgresql://cea:cea_dev_password@localhost:5432/cea_restore_test"
