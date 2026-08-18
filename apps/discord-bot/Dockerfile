# Production Dockerfile for Discord Bot
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the source code
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.7.1 --activate

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/discord-bot/node_modules ./apps/discord-bot/node_modules

# Copy source files
COPY apps/discord-bot ./apps/discord-bot
COPY packages ./packages
COPY turbo.json ./
COPY package.json pnpm-workspace.yaml ./

# Build the app
WORKDIR /app
RUN pnpm discord-bot:build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN apk add --no-cache ffmpeg

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 botuser

# Copy built application
COPY --from=builder --chown=botuser:nodejs /app/apps/discord-bot/dist ./apps/discord-bot/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/discord-bot/package.json ./apps/discord-bot/

USER botuser

WORKDIR /app/apps/discord-bot

CMD ["node", "dist/index.js"]
