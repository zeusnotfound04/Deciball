# Prod deploy: single host, docker-compose.prod.yml, host nginx + certbot webroot, migrate service

**Decision (2026-11-25):** Production runs on one Ubuntu host (`deciball.zeusnotfound.codes`, nginx 1.28 shared with
other sites) using `docker-compose.prod.yml`, driven by `deploy/deploy.sh`. Runbook: `deploy/README.md`.

- **Migrations** run in a one-shot `migrate` compose service built from `apps/web/Dockerfile` `target: deps`
  (`prisma migrate deploy`). `web` depends on it with `service_completed_successfully`.
  - Rejected: `docker exec deciball-web npx prisma ...` (the old deploy.sh). The runner is a Next standalone bundle
    with no Prisma CLI, so `npx` fetches Prisma 7, which rejects this 5.19 schema; the old script hid that failure.
  - Rejected: `prisma db push` in prod (no migration history), and migrating in web's entrypoint (couples startup to DDL).
- **Env files** (`.env`, `apps/web/.env.production`, `apps/ws/.env.production`) are generated once by deploy.sh with
  `openssl rand -hex 32` secrets and never regenerated. Postgres only reads `POSTGRES_PASSWORD` on first volume init.
  Rotation goes through `deploy/rotate-db-secrets.sh`.
- **`NEXT_PUBLIC_WSS_URL` is baked in at build time.** `next build` picks it up from `apps/web/.env.production` in the
  Docker build context. If `.env.production` is ever added to `.dockerignore`, switch to build args first or WS breaks.
- **TLS:** `certbot certonly --webroot` behind an HTTP-only bootstrap server block, then the full template.
  - Rejected: `certbot --nginx`. It rewrites files the script re-renders, and the old flow installed an SSL server
    block before the cert existed, so `nginx -t` failed. On a shared nginx that blocks reloads for every site.
- Every nginx change runs `nginx -t` and restores the previous file on failure before any reload.

**Known single points of failure (accepted for now):** one host, one Postgres volume. Backups must leave the box.
