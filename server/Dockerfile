# ==============================================================================
# Production Dockerfile for InjeraOS Server (Render / Docker)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Stage with Corepack & pnpm
# ------------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate
WORKDIR /app

# ------------------------------------------------------------------------------
# 2. Server Builder Stage
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run db:generate
RUN pnpm run build

# ------------------------------------------------------------------------------
# 3. Production Dependencies
# ------------------------------------------------------------------------------
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --prod --frozen-lockfile

# ------------------------------------------------------------------------------
# 4. Production Final Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install OpenSSL & libc6-compat for Prisma & native runtime dependencies on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy backend dependencies, Prisma schema/migrations, generated Prisma client, and compiled artifacts
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma7.config.ts* ./
COPY --from=builder --chown=node:node /app/src/generated ./src/generated
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/healthz || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
