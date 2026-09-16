#!/usr/bin/env bash
# Rotate the Postgres + Redis passwords used by the production docker-compose
# stack and rewrite every env file that embeds them:
#
#   .env                         POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB / REDIS_PASSWORD
#   apps/web/.env.production     DATABASE_URL / DIRECT_URL / REDIS_URL / REDIS_HOST / REDIS_PORT / REDIS_PASSWORD
#   apps/ws/.env.production      DATABASE_URL / DIRECT_URL / REDIS_URL / REDIS_HOST / REDIS_PORT / REDIS_PASSWORD
#
# Usage:
#   deploy/rotate-db-secrets.sh            # write files only, print next steps
#   deploy/rotate-db-secrets.sh --apply    # also ALTER USER in the live Postgres and recreate redis/web/ws
#   deploy/rotate-db-secrets.sh --dry-run  # show what would change, touch nothing
#
# POSTGRES_PASSWORD in compose is only honoured when the data volume is first
# initialised. On an existing database the password must be changed with
# ALTER USER, which is what --apply does. Without --apply you must run that
# statement yourself before restarting web/ws or they will fail to connect.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.prod.yml"
ROOT_ENV="$ROOT/.env"
WEB_ENV="$ROOT/apps/web/.env.production"
WS_ENV="$ROOT/apps/ws/.env.production"
PG_CONTAINER="deciball-postgres"

APPLY=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --apply)   APPLY=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR\033[0m %s\n' "$*" >&2; exit 1; }

command -v openssl >/dev/null || die "openssl is required"

# URL-safe (no / + = : @) so it can be embedded in DATABASE_URL / REDIS_URL unescaped.
gen_secret() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 40; }

# Read KEY from an env file, stripping optional surrounding quotes. Empty if absent.
read_kv() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 0
  grep -E "^${key}=" "$file" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}

# Upsert KEY=VALUE in an env file (replace in place if present, append otherwise).
set_kv() {
  local file="$1" key="$2" value="$3"
  if [ "$DRY_RUN" = 1 ]; then
    printf '   %-22s %s=%s\n' "$(basename "$(dirname "$file")")/$(basename "$file")" "$key" "$(mask "$value")"
    return
  fi
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k {print k"="v; next} {print}' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

mask() {
  local v="$1"
  printf '%s' "$v" | sed -E 's#(://[^:@/]*:)[^@]+@#\1***@#; s#^([A-Za-z0-9]{4})[A-Za-z0-9]{8,}$#\1***#'
}

# ---------------------------------------------------------------------------
# Resolve identity that stays the same across rotation
# ---------------------------------------------------------------------------
PG_USER="$(read_kv "$ROOT_ENV" POSTGRES_USER)"; PG_USER="${PG_USER:-deciball}"
PG_DB="$(read_kv "$ROOT_ENV" POSTGRES_DB)";     PG_DB="${PG_DB:-deciball}"
OLD_PG_PASS="$(read_kv "$ROOT_ENV" POSTGRES_PASSWORD)"

NEW_PG_PASS="$(gen_secret)"
NEW_REDIS_PASS="$(gen_secret)"

# Service hostnames inside the compose network.
DATABASE_URL="postgresql://${PG_USER}:${NEW_PG_PASS}@postgres:5432/${PG_DB}"
REDIS_URL="redis://:${NEW_REDIS_PASS}@redis:6379"

log "Rotating secrets for user=${PG_USER} db=${PG_DB}"
[ "$DRY_RUN" = 1 ] && log "DRY RUN — no files will be written"

# ---------------------------------------------------------------------------
# Backups (chmod 600 — they contain the previous secrets)
# ---------------------------------------------------------------------------
if [ "$DRY_RUN" = 0 ]; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  for f in "$ROOT_ENV" "$WEB_ENV" "$WS_ENV"; do
    if [ -f "$f" ]; then
      cp "$f" "$f.bak.$STAMP"
      chmod 600 "$f.bak.$STAMP"
    fi
  done
  log "Backups written as *.bak.$STAMP"
fi

# ---------------------------------------------------------------------------
# Write env files
# ---------------------------------------------------------------------------
log "Updating $(basename "$ROOT_ENV")"
set_kv "$ROOT_ENV" POSTGRES_USER     "$PG_USER"
set_kv "$ROOT_ENV" POSTGRES_PASSWORD "$NEW_PG_PASS"
set_kv "$ROOT_ENV" POSTGRES_DB       "$PG_DB"
set_kv "$ROOT_ENV" REDIS_PASSWORD    "$NEW_REDIS_PASS"

for f in "$WEB_ENV" "$WS_ENV"; do
  log "Updating ${f#$ROOT/}"
  set_kv "$f" DATABASE_URL   "$DATABASE_URL"
  set_kv "$f" DIRECT_URL     "$DATABASE_URL"
  set_kv "$f" REDIS_URL      "$REDIS_URL"
  set_kv "$f" REDIS_HOST     "redis"
  set_kv "$f" REDIS_PORT     "6379"
  set_kv "$f" REDIS_PASSWORD "$NEW_REDIS_PASS"
done

if [ "$DRY_RUN" = 0 ]; then
  chmod 600 "$ROOT_ENV" "$WEB_ENV" "$WS_ENV"
fi

# ---------------------------------------------------------------------------
# Apply to the running stack
# ---------------------------------------------------------------------------
if [ "$APPLY" = 1 ] && [ "$DRY_RUN" = 0 ]; then
  command -v docker >/dev/null || die "docker is required for --apply"

  if docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
    log "Changing password in live Postgres ($PG_CONTAINER)"
    # psql over the container's unix socket authenticates as the superuser without a password.
    docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" \
      -c "ALTER USER \"${PG_USER}\" WITH PASSWORD '${NEW_PG_PASS}';" >/dev/null
    log "Postgres password changed"
  else
    warn "$PG_CONTAINER is not running. If a data volume already exists, the new"
    warn "POSTGRES_PASSWORD will NOT take effect on it — start postgres and run:"
    warn "  docker exec -i $PG_CONTAINER psql -U $PG_USER -d $PG_DB -c \"ALTER USER \\\"$PG_USER\\\" WITH PASSWORD '<new>';\""
  fi

  log "Recreating redis, web, ws with the new secrets"
  docker compose -f "$COMPOSE_FILE" up -d --force-recreate redis web ws

  log "Waiting for web to answer on :4000"
  for _ in $(seq 1 30); do
    if curl -sf -o /dev/null http://127.0.0.1:4000/; then
      log "web is up"
      break
    fi
    sleep 2
  done
  docker compose -f "$COMPOSE_FILE" ps
else
  cat <<EOF

Next steps (not applied because --apply was not given):

  # 1. If the database already exists, set the new password inside Postgres:
  docker exec -i $PG_CONTAINER psql -U $PG_USER -d $PG_DB \\
    -c "ALTER USER \"$PG_USER\" WITH PASSWORD '<value of POSTGRES_PASSWORD in .env>';"

  # 2. Recreate the containers so they pick up the new env files:
  docker compose -f docker-compose.prod.yml up -d --force-recreate redis web ws

Re-run with --apply to have this script do both.
EOF
fi

if [ "$DRY_RUN" = 0 ]; then
  log "Done. New values:"
  printf '   POSTGRES_PASSWORD=%s\n   REDIS_PASSWORD=%s\n   DATABASE_URL=%s\n' \
    "$(mask "$NEW_PG_PASS")" "$(mask "$NEW_REDIS_PASS")" "$(mask "$DATABASE_URL")"
  [ -n "$OLD_PG_PASS" ] && log "Previous secrets are in the *.bak.$STAMP files — delete them once you've verified the stack."
fi
