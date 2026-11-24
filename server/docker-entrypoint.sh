#!/bin/sh
set -e

echo "🚀 Starting InjeraOS API Production Environment..."

# Optional: Run database migrations if RUN_MIGRATIONS=true or by default
if [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "📦 Applying Prisma database migrations..."
  ./node_modules/.bin/prisma migrate deploy
fi

# Optional: Seed superadmin if SEED_SUPERADMIN=true
if [ "$SEED_SUPERADMIN" = "true" ]; then
  echo "🌱 Seeding initial superadmin..."
  ./node_modules/.bin/tsx prisma/seed-superadmin.ts || true
fi

echo "✨ Starting API application on port ${PORT:-3000}..."
exec "$@"
