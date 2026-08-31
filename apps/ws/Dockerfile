FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/ws/package.json ./apps/ws/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate
COPY --from=deps /app/ ./
COPY . .
RUN pnpm --filter @deciball/database run postinstall
RUN pnpm --filter ws build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 wsuser
COPY --from=builder --chown=wsuser:nodejs /app/apps/ws/dist ./apps/ws/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/ws/node_modules ./apps/ws/node_modules
COPY --from=builder /app/apps/ws/package.json ./apps/ws/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/generated ./packages/database/generated
USER wsuser
EXPOSE 8080
WORKDIR /app/apps/ws
CMD ["node", "dist/app.js"]
