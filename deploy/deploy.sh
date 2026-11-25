#!/usr/bin/env bash
# Deploy Deciball (Postgres + Redis + web + ws) on a single host behind the host's nginx,
# with a Let's Encrypt certificate. Idempotent: use it for the first install and for every
# release:
#
#   git pull --ff-only && ./deploy/deploy.sh
#
# First run only: generates .env, apps/web/.env.production and apps/ws/.env.production with
# fresh Postgres / Redis / NextAuth / JWT secrets. Existing env files are never rewritten,
# because Postgres only honours POSTGRES_PASSWORD when its volume is first created. To change
# DB/Redis passwords later, use deploy/rotate-db-secrets.sh.
#
# Environment overrides:
#   DOMAIN               default deciball.zeusnotfound.codes
#   LETSENCRYPT_EMAIL    expiry notices; optional if certbot already has an account
#   WEB_HOST_PORT        loopback port nginx proxies to for web (default 4000)
#   WS_HOST_PORT         loopback port nginx proxies to for ws  (default 8080)
#   GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET
#   AWS_S3_REGION AWS_S3_BUCKET_NAME AWS_S3_ACCESS_KEY_ID AWS_S3_SECRET_ACCESS_KEY
#   UPLOADTHING_TOKEN DOWNLOAD_URL
#                        copied into apps/web/.env.production when it is first generated
#   SKIP_NGINX=1         containers only, no nginx/certbot (local dry run)

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOMAIN="${DOMAIN:-deciball.zeusnotfound.codes}"
export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

ROOT_ENV=.env
WEB_ENV=apps/web/.env.production
WS_ENV=apps/ws/.env.production

NGINX_SITE=/etc/nginx/sites-available/deciball
NGINX_LINK=/etc/nginx/sites-enabled/deciball
ACME_ROOT=/var/www/certbot

REQUIRED_KEYS="GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET"
OPTIONAL_KEYS="SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET AWS_S3_REGION AWS_S3_BUCKET_NAME AWS_S3_ACCESS_KEY_ID AWS_S3_SECRET_ACCESS_KEY UPLOADTHING_TOKEN DOWNLOAD_URL"

# Base64 of a fixed 16-byte nonce; only used to probe the WebSocket handshake.
WS_PROBE_KEY="ZGVjaWJhbGxoZWFsdGgxMg=="

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR\033[0m %s\n' "$*" >&2; exit 1; }
trap 'warn "deploy.sh stopped at line $LINENO"' ERR

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

# Value of KEY in an env file with surrounding quotes stripped; empty if absent.
read_kv() {
  [ -f "$1" ] || return 0
  { grep -E "^$2=" "$1" || true; } | tail -n1 | cut -d= -f2- |
    sed -E "s/^\"(.*)\"\$/\\1/; s/^'(.*)'\$/\\1/"
}

gen_secret() { openssl rand -hex 32; }

http_code() {
  # http_code URL TIMEOUT [curl args...] -> status code, 000 if unreachable
  local url="$1" timeout="$2"
  shift 2
  curl -s -o /dev/null -m "$timeout" -w '%{http_code}' "$@" "$url" || true
}

ws_probe() {
  # ws_probe URL [curl args...] -> 101 when the WebSocket handshake succeeds
  local url="$1"
  shift
  http_code "$url" 3 --http1.1 \
    -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
    -H 'Sec-WebSocket-Version: 13' -H "Sec-WebSocket-Key: $WS_PROBE_KEY" "$@"
}

# ---------------------------------------------------------------------------- preflight

preflight() {
  command -v docker >/dev/null 2>&1 ||
    die "docker is not installed. Install it with: curl -fsSL https://get.docker.com | sudo sh"
  docker compose version >/dev/null 2>&1 ||
    die "the docker compose v2 plugin is missing (sudo apt-get install -y docker-compose-plugin)"
  docker info >/dev/null 2>&1 ||
    die "cannot reach the Docker daemon. Run: sudo usermod -aG docker \$USER, then log out and back in."
  local c
  for c in openssl curl; do
    command -v "$c" >/dev/null 2>&1 || die "$c is required"
  done

  if [ -r /proc/meminfo ]; then
    local kb
    kb="$(awk '/^(MemTotal|SwapTotal):/ {s += $2} END {print s}' /proc/meminfo)"
    if [ "$kb" -lt 3500000 ]; then
      warn "RAM + swap is $((kb / 1024)) MB; next build can be OOM-killed below ~3.5 GB. Add swap first (deploy/README.md)."
    fi
  fi
}

# ---------------------------------------------------------------------------- env files

seed_line() {
  # KEY='value' from the caller's environment, or KEY= when unset.
  local key="$1" val
  val="$(printenv "$key" || true)"
  if [ -n "$val" ]; then printf "%s='%s'\n" "$key" "$val"; else printf '%s=\n' "$key"; fi
}

generate_env() {
  local key val
  for key in $REQUIRED_KEYS $OPTIONAL_KEYS; do
    val="$(printenv "$key" || true)"
    case "$val" in
      *"'"*) die "$key contains a single quote; leave it unset and edit $WEB_ENV by hand instead" ;;
    esac
  done

  local pg_user=deciball pg_db=deciball pg_pass redis_pass nextauth_secret jwt_secret stamp
  pg_pass="$(gen_secret)"
  redis_pass="$(gen_secret)"
  nextauth_secret="$(gen_secret)"
  jwt_secret="$(gen_secret)"
  stamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local db_url="postgresql://${pg_user}:${pg_pass}@postgres:5432/${pg_db}"
  local redis_url="redis://:${redis_pass}@redis:6379"

  log "Generating $ROOT_ENV, $WEB_ENV and $WS_ENV with fresh secrets"
  (
    umask 077
    cat >"$ROOT_ENV.tmp" <<EOF
# Generated by deploy/deploy.sh at $stamp. Read by docker-compose.prod.yml.
POSTGRES_USER=$pg_user
POSTGRES_PASSWORD=$pg_pass
POSTGRES_DB=$pg_db
REDIS_PASSWORD=$redis_pass
WEB_HOST_PORT=${WEB_HOST_PORT:-4000}
WS_HOST_PORT=${WS_HOST_PORT:-8080}
EOF

    {
      cat <<EOF
# Generated by deploy/deploy.sh at $stamp.
# NEXT_PUBLIC_* values are inlined by \`next build\`; after changing one, re-run deploy.sh.
NODE_ENV=production
DATABASE_URL=$db_url
DIRECT_URL=$db_url
REDIS_URL=$redis_url
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$redis_pass
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$nextauth_secret
JWT_SECRET=$jwt_secret
NEXT_PUBLIC_WSS_URL=wss://$DOMAIN/ws
NEXT_PUBLIC_API_URL=https://$DOMAIN
NEXT_PUBLIC_API_BASE_URL=https://$DOMAIN

# Third-party credentials
EOF
      for key in $REQUIRED_KEYS $OPTIONAL_KEYS; do seed_line "$key"; done
    } >"$WEB_ENV.tmp"

    cat >"$WS_ENV.tmp" <<EOF
# Generated by deploy/deploy.sh at $stamp. JWT_SECRET must equal the one in $WEB_ENV.
NODE_ENV=production
PORT=8080
DATABASE_URL=$db_url
DIRECT_URL=$db_url
REDIS_URL=$redis_url
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$redis_pass
JWT_SECRET=$jwt_secret
MAX_WORKERS=2
INSTANCE_TYPE=production
TASK_TIMEOUT=30000
EOF
  )
  mv "$ROOT_ENV.tmp" "$ROOT_ENV"
  mv "$WEB_ENV.tmp" "$WEB_ENV"
  mv "$WS_ENV.tmp" "$WS_ENV"
}

ensure_env() {
  local n=0 f
  for f in "$ROOT_ENV" "$WEB_ENV" "$WS_ENV"; do
    if [ -f "$f" ]; then n=$((n + 1)); fi
  done
  if [ "$n" -eq 0 ]; then
    generate_env
  elif [ "$n" -ne 3 ]; then
    die "Only some of $ROOT_ENV, $WEB_ENV, $WS_ENV exist. Refusing to generate secrets that would not match an existing database. Restore the missing file(s); for a brand-new install, delete all three (and any deciball_* volumes) and re-run."
  fi
  chmod 600 "$ROOT_ENV" "$WEB_ENV" "$WS_ENV"

  local key missing="" empty=""
  for key in $REQUIRED_KEYS; do
    if [ -z "$(read_kv "$WEB_ENV" "$key")" ]; then missing="$missing $key"; fi
  done
  if [ -n "$missing" ]; then
    die "Fill in$missing in $WEB_ENV, then re-run ./deploy/deploy.sh
       Google Cloud console -> OAuth client -> Authorized redirect URI: https://$DOMAIN/api/auth/callback/google"
  fi
  for key in $OPTIONAL_KEYS; do
    if [ -z "$(read_kv "$WEB_ENV" "$key")" ]; then empty="$empty $key"; fi
  done
  if [ -n "$empty" ]; then warn "Empty in $WEB_ENV (features that use them will fail):$empty"; fi

  if [ "$(read_kv "$WEB_ENV" JWT_SECRET)" != "$(read_kv "$WS_ENV" JWT_SECRET)" ]; then
    die "JWT_SECRET differs between $WEB_ENV and $WS_ENV; every WebSocket login would be rejected"
  fi
  local wss
  wss="$(read_kv "$WEB_ENV" NEXT_PUBLIC_WSS_URL)"
  if [ "$wss" != "wss://$DOMAIN/ws" ]; then
    warn "NEXT_PUBLIC_WSS_URL is '$wss', expected 'wss://$DOMAIN/ws'"
  fi
}

# ---------------------------------------------------------------------------- ports

resolve_ports() {
  # Same precedence as compose interpolation: shell env, then .env, then default.
  WEB_PORT="${WEB_HOST_PORT:-$(read_kv "$ROOT_ENV" WEB_HOST_PORT)}"
  WS_PORT="${WS_HOST_PORT:-$(read_kv "$ROOT_ENV" WS_HOST_PORT)}"
  WEB_PORT="${WEB_PORT:-4000}"
  WS_PORT="${WS_PORT:-8080}"
}

port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    [ -n "$(ss -Htln "sport = :$1" 2>/dev/null)" ]
  else
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  fi
}

check_ports() {
  local svc port var
  for svc in web ws; do
    if [ "$svc" = web ]; then port="$WEB_PORT" var=WEB_HOST_PORT; else port="$WS_PORT" var=WS_HOST_PORT; fi
    if [ -z "$(docker compose ps -q --status running "$svc" 2>/dev/null)" ] && port_in_use "$port"; then
      die "Port $port ($svc) is already taken by another process. Set a free $var in $ROOT_ENV and re-run."
    fi
  done
}

# ---------------------------------------------------------------------------- containers

deploy_stack() {
  log "Building images one at a time (caps peak memory on small hosts)"
  docker compose build migrate
  docker compose build ws
  docker compose build web

  log "Starting postgres -> redis -> migrate -> web, ws"
  if ! docker compose up -d --remove-orphans; then
    docker compose logs --no-color --tail=80 migrate web ws || true
    die "docker compose up failed (logs above)"
  fi
}

wait_for_web() {
  log "Waiting for web on 127.0.0.1:$WEB_PORT"
  for _ in $(seq 1 60); do
    if [ "$(http_code "http://127.0.0.1:$WEB_PORT/api/auth/providers" 5)" = 200 ]; then return 0; fi
    sleep 2
  done
  docker compose logs --no-color --tail=80 web || true
  die "web did not return 200 on /api/auth/providers within 120s (logs above)"
}

wait_for_ws() {
  log "Waiting for ws on 127.0.0.1:$WS_PORT"
  for _ in $(seq 1 30); do
    if [ "$(ws_probe "http://127.0.0.1:$WS_PORT/ws")" = 101 ]; then return 0; fi
    sleep 2
  done
  docker compose logs --no-color --tail=80 ws || true
  die "ws did not complete a WebSocket handshake within 60s (logs above)"
}

# ---------------------------------------------------------------------------- nginx + TLS

render() {
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__WEB_PORT__|$WEB_PORT|g" \
    -e "s|__WS_PORT__|$WS_PORT|g" -e "s|__ACME_ROOT__|$ACME_ROOT|g" "$1"
}

install_site() {
  local template="$1" rendered backup=""
  rendered="$(mktemp)"
  render "$template" >"$rendered"
  if $SUDO test -f "$NGINX_SITE"; then
    backup="$(mktemp)"
    $SUDO cat "$NGINX_SITE" >"$backup"
  fi
  $SUDO install -m 644 "$rendered" "$NGINX_SITE"
  $SUDO ln -sfn "$NGINX_SITE" "$NGINX_LINK"
  rm -f "$rendered"

  if ! $SUDO nginx -t >/dev/null 2>&1; then
    $SUDO nginx -t 2>&1 | sed 's/^/    /' >&2 || true
    if [ -n "$backup" ]; then
      $SUDO install -m 644 "$backup" "$NGINX_SITE"
      rm -f "$backup"
    else
      $SUDO rm -f "$NGINX_LINK" "$NGINX_SITE"
    fi
    die "nginx rejected the config rendered from $template; previous state restored, nginx not reloaded"
  fi
  if [ -n "$backup" ]; then rm -f "$backup"; fi
  $SUDO systemctl reload nginx
}

setup_nginx() {
  command -v nginx >/dev/null 2>&1 || die "nginx is not installed (sudo apt-get install -y nginx)"
  if ! command -v certbot >/dev/null 2>&1; then
    command -v apt-get >/dev/null 2>&1 || die "certbot is not installed"
    log "Installing certbot"
    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq certbot
  fi
  $SUDO nginx -t >/dev/null 2>&1 ||
    die "nginx config is already invalid before this deploy (run: sudo nginx -t). Fix that first."

  local other
  other="$($SUDO grep -RlF "$DOMAIN" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null |
    grep -vxF "$NGINX_LINK" || true)"
  if [ -n "$other" ]; then
    die "Another nginx config already mentions $DOMAIN: $other. Disable it first; nginx ignores duplicate server_names."
  fi

  $SUDO mkdir -p "$ACME_ROOT"
  if ! $SUDO test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
    getent hosts "$DOMAIN" >/dev/null || die "$DOMAIN does not resolve. Point its A record at this server first."
    log "No certificate for $DOMAIN yet; serving the ACME challenge over HTTP"
    install_site deploy/nginx-bootstrap.conf.template

    local email_args=(--register-unsafely-without-email)
    if [ -n "${LETSENCRYPT_EMAIL:-}" ]; then email_args=(--email "$LETSENCRYPT_EMAIL"); fi
    log "Requesting a Let's Encrypt certificate"
    $SUDO certbot certonly --webroot -w "$ACME_ROOT" -d "$DOMAIN" --cert-name "$DOMAIN" \
      --non-interactive --agree-tos "${email_args[@]}" \
      --deploy-hook "systemctl reload nginx"
  fi

  log "Installing nginx site for https://$DOMAIN"
  install_site deploy/nginx.conf.template
}

verify_tls() {
  # --resolve hits this host's nginx directly, so the check does not depend on hairpin NAT.
  local resolve=(--resolve "$DOMAIN:443:127.0.0.1") code
  code="$(http_code "https://$DOMAIN/api/auth/providers" 15 "${resolve[@]}")"
  [ "$code" = 200 ] || die "https://$DOMAIN/api/auth/providers via local nginx returned '$code'"
  code="$(ws_probe "https://$DOMAIN/ws" "${resolve[@]}")"
  [ "$code" = 101 ] || die "wss://$DOMAIN/ws handshake via local nginx returned '$code', expected 101"
}

# ---------------------------------------------------------------------------- main

main() {
  preflight
  ensure_env
  resolve_ports
  check_ports
  deploy_stack
  wait_for_web
  wait_for_ws

  if [ "${SKIP_NGINX:-0}" = 1 ]; then
    log "SKIP_NGINX=1: web on http://127.0.0.1:$WEB_PORT, ws on ws://127.0.0.1:$WS_PORT/ws"
  else
    setup_nginx
    verify_tls
  fi

  docker compose ps
  log "Live: https://$DOMAIN  (WebSocket: wss://$DOMAIN/ws)"
}

main "$@"
