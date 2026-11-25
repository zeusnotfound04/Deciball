# Production deploy: deciball.zeusnotfound.codes

A single Ubuntu host runs everything in Docker. The host's nginx terminates TLS with a Let's
Encrypt certificate and proxies to containers bound to loopback only.

```
browser ──https──▶ nginx (host) ──▶ 127.0.0.1:4000  web  (Next.js standalone)
        ──wss /ws─▶             ──▶ 127.0.0.1:8080  ws   (WebSocket server)
                                        │
                     docker network ────┼── postgres:16  (volume deciball_deciball-pgdata)
                                        ├── redis:7      (volume deciball_deciball-redisdata)
                                        └── migrate      (one-shot `prisma migrate deploy`)
```

`deploy/deploy.sh` does the whole thing and is safe to re-run. Order of operations: preflight →
generate env files (first run only) → build images → `compose up` (postgres/redis healthy →
migrate exits 0 → web, ws) → health checks → nginx + certificate → TLS check through nginx.

## 1. One-time server setup

DNS: `deciball.zeusnotfound.codes` needs an A record pointing at the server. If it's on
Cloudflare, keep the record DNS-only (grey cloud) at least until the first certificate is
issued. The AWS security group must allow inbound 80 and 443. Postgres, Redis, 4000 and 8080
are never exposed publicly.

```bash
ssh ubuntu@<server>

# Docker Engine + compose plugin (skip if `docker compose version` already works)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
exit                                   # log out so the docker group applies, then ssh back in

# nginx, certbot, git (nginx is likely already installed)
sudo apt-get update && sudo apt-get install -y nginx certbot git

# Swap: `next build` needs ~3.5 GB of RAM + swap. Skip if `free -g` already shows enough.
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. First deploy

```bash
sudo mkdir -p /opt/deciball && sudo chown "$USER:$USER" /opt/deciball
git clone https://github.com/zeusnotfound04/Deciball.git /opt/deciball
cd /opt/deciball

# Run 1: generates .env, apps/web/.env.production, apps/ws/.env.production with random
# Postgres/Redis/NextAuth/JWT secrets, then stops because Google OAuth keys are empty.
LETSENCRYPT_EMAIL=<your email> ./deploy/deploy.sh

# Fill in the third-party keys. GOOGLE_* is required; Spotify, S3, UploadThing and
# DOWNLOAD_URL are needed for the features that use them.
nano apps/web/.env.production

# Run 2: build, migrate, start, nginx, certificate. Takes several minutes the first time.
LETSENCRYPT_EMAIL=<your email> ./deploy/deploy.sh
```

In the Google Cloud console, add this to the OAuth client before you test login:

- Authorized JavaScript origin: `https://deciball.zeusnotfound.codes`
- Authorized redirect URI: `https://deciball.zeusnotfound.codes/api/auth/callback/google`

## 3. Every release after that

```bash
cd /opt/deciball && git pull --ff-only && ./deploy/deploy.sh
```

New Prisma migrations are applied automatically by the `migrate` service before the new web
container starts. If a migration fails, web keeps running the old image and the script prints
the migrate logs.

## Rules that will bite you

- **Never delete or regenerate the env files on a live server.** Postgres only reads
  `POSTGRES_PASSWORD` when its volume is first created. New secrets plus the old volume means
  web can't connect. To change the DB/Redis passwords, use `deploy/rotate-db-secrets.sh --apply`.
- **`NEXT_PUBLIC_*` values are baked in at build time.** `next build` reads
  `apps/web/.env.production` from the Docker build context. After changing one, re-run
  `deploy.sh`; a restart alone won't pick it up. Don't add `.env.production` to `.dockerignore`
  unless you also switch those values to build args.
- Changing `NEXTAUTH_SECRET` logs everyone out. Changing `JWT_SECRET` needs the same value in
  both `apps/web/.env.production` and `apps/ws/.env.production`; `deploy.sh` refuses to run if
  they differ.
- Server-only keys (Google, Spotify, S3, ...) only need a restart:
  `docker compose -f docker-compose.prod.yml up -d --force-recreate web`.

## Operations

```bash
cd /opt/deciball
alias dc='docker compose -f docker-compose.prod.yml'

dc ps                                   # status
dc logs -f --tail=200 web ws            # logs
dc logs migrate                         # last migration run
dc restart ws                           # restart one service
docker exec -it deciball-postgres psql -U deciball -d deciball
docker exec -it deciball-redis sh -c 'redis-cli -a "$REDIS_PASSWORD"'   # see .env for the value
```

### Backups (do this before you have real users)

Postgres and the backups share one disk on one host, which makes that disk a single point of
failure. Copy dumps off the box (S3, another machine).

```bash
sudo mkdir -p /var/backups/deciball && sudo chown "$USER" /var/backups/deciball
crontab -e
# 03:00 daily dump, keep 14 days
0 3 * * * docker exec deciball-postgres pg_dump -U deciball -d deciball -Fc > /var/backups/deciball/deciball-$(date +\%F).dump && find /var/backups/deciball -name '*.dump' -mtime +14 -delete
```

Restore: `docker exec -i deciball-postgres pg_restore -U deciball -d deciball --clean --if-exists < file.dump`

### Rollback

```bash
git checkout <previous-sha> && ./deploy/deploy.sh
```

Migrations only move forward. Rolling back the code past a migration that dropped or renamed
something will break the old code, so for those releases take a dump first.

### TLS renewal

`certbot certonly --webroot` saved its renewal config, and the system certbot timer renews
automatically through the `/.well-known/acme-challenge/` location that stays on port 80. The
deploy hook reloads nginx. Check with `sudo certbot renew --dry-run`.

## Local dry run (no nginx/certbot)

```bash
SKIP_NGINX=1 WEB_HOST_PORT=14000 WS_HOST_PORT=18080 ./deploy/deploy.sh
```

This writes the same env files as a real deploy. Do it in a separate checkout, not in a dev
tree whose root `.env` holds dev port overrides: the script refuses to run when only some of
the three env files exist.
