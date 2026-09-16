# Auth: stay on next-auth v4 until Auth.js v5 ships a stable release

**Decision (2026-09-17):** Keep `next-auth@^4.24.x` with Next.js 16. Do not migrate to Auth.js v5.

**Why:** As of this date `next-auth@latest` is 4.24.15 and v5 is still `5.0.0-beta.x`. Production auth does not go on a beta.
v4 works on Next 16 (proxy.ts uses `getToken` from `next-auth/jwt`; verified in the standalone Docker image). The peer
range mismatch is declared in root `package.json` under `pnpm.peerDependencyRules.allowedVersions` (`next-auth>next: 16`).

**When to revisit:** v5 reaches a non-beta `latest` tag. Migration surface at that point: ~25 files, 10 `getServerSession`
call sites → `auth()`, `@next-auth/prisma-adapter` → `@auth/prisma-adapter`, proxy token check, cookie-name change
(`next-auth.*` → `authjs.*`) which logs every user out. The WS server is unaffected: it verifies its own `jsonwebtoken`
tokens with `JWT_SECRET`, not next-auth JWTs.
