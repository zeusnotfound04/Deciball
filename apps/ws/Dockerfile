# Production Dockerfile for WebSocket Server
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/ws/package.json ./apps/ws/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the source code
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ws/node_modules ./apps/ws/node_modules

# Copy source files
COPY apps/ws ./apps/ws
COPY packages ./packages
COPY turbo.json ./
COPY package.json pnpm-workspace.yaml ./

# Build the app
WORKDIR /app
RUN pnpm ws:build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wsuser

# Copy built application
COPY --from=builder --chown=wsuser:nodejs /app/apps/ws/dist ./apps/ws/dist
COPY --from=builder --chown=wsuser:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/ws/package.json ./apps/ws/

USER wsuser

EXPOSE 8080

WORKDIR /app/apps/ws

CMD ["node", "dist/app.js"]
