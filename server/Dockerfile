# ==============================================================================
# Multi-Stage Production Dockerfile for InjeraOS (Client + Server)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Stage with Corepack & pnpm
# ------------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate
WORKDIR /app

# ------------------------------------------------------------------------------
# 2. Client Builder Stage
# ------------------------------------------------------------------------------
FROM base AS client-builder
WORKDIR /app/client
COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY client/ ./
RUN pnpm build

# ------------------------------------------------------------------------------
# 3. Server Builder Stage
# ------------------------------------------------------------------------------
FROM base AS server-builder
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY server/ ./
RUN pnpm run db:generate
RUN pnpm run build

# ------------------------------------------------------------------------------
# 4. Production Dependencies
# ------------------------------------------------------------------------------
FROM base AS prod-deps
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY server/prisma ./prisma
RUN pnpm run db:generate

# ------------------------------------------------------------------------------
# 5. Production Final Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV CLIENT_DIST_PATH=/app/client/dist

# Install OpenSSL for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy built frontend assets
COPY --from=client-builder --chown=node:node /app/client/dist /app/client/dist

# Copy backend dependencies, Prisma, and compiled artifacts
WORKDIR /app/server
COPY --from=prod-deps --chown=node:node /app/server/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/server/prisma ./prisma
COPY --from=server-builder --chown=node:node /app/server/dist ./dist
COPY --from=server-builder --chown=node:node /app/server/package.json ./package.json

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
