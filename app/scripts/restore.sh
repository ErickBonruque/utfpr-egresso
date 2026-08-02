#!/usr/bin/env bash
# Restore de um backup do CEA (Fase 9).
#
# Uso:
#   ./scripts/restore.sh backups/cea-20260802-120000.dump [DATABASE_URL_DESTINO]
#
# Sem o segundo argumento, restaura sobre a DATABASE_URL do app/.env — o que
# APAGA o banco atual. Por isso pede confirmação. Passar um destino explícito
# (um banco novo) é o modo recomendado para *testar* o backup, que é o único
# jeito de saber que ele presta.
set -euo pipefail

cd "$(dirname "$0")/.."

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "uso: ./scripts/restore.sh <arquivo.dump> [DATABASE_URL_DESTINO]" >&2
  exit 1
fi

TARGET="${2:-}"
if [[ -z "$TARGET" ]]; then
  if [[ -f .env ]]; then
    TARGET="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
  fi
  echo "ATENÇÃO: sem destino explícito, o restore vai sobre o banco de trabalho."
  echo "Destino: $TARGET"
  read -r -p "Digite 'restaurar' para continuar: " CONFIRM
  [[ "$CONFIRM" == "restaurar" ]] || { echo "cancelado."; exit 1; }
fi

# postgres://user:senha@host:porta/nome → separa o nome do banco da URL do
# servidor, porque criar o banco exige conectar em outro (postgres).
DB_NAME="${TARGET##*/}"
DB_NAME="${DB_NAME%%\?*}"
SERVER_URL="${TARGET%/*}"

RUN=(docker run --rm --network host -i postgres:17-alpine)

echo "Garantindo que o banco '$DB_NAME' existe ..."
"${RUN[@]}" psql "$SERVER_URL/postgres" -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  "${RUN[@]}" psql "$SERVER_URL/postgres" -c "CREATE DATABASE \"$DB_NAME\""

echo "Restaurando $DUMP em $DB_NAME ..."
# --clean --if-exists deixa o restore repetível sobre um banco já populado.
"${RUN[@]}" pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname "$TARGET" <"$DUMP"

echo
echo "Conferência rápida:"
"${RUN[@]}" psql "$TARGET" -c "
  SELECT 'campi' AS tabela, count(*) FROM campuses
  UNION ALL SELECT 'cursos', count(*) FROM courses
  UNION ALL SELECT 'usuários', count(*) FROM users
  UNION ALL SELECT 'matrículas', count(*) FROM enrollments
  ORDER BY 1;"
echo "OK — restore concluído em $DB_NAME"
