#!/usr/bin/env sh
set -e

echo "Starting DeckVault Docker stack..."
docker compose up -d postgres adminer

echo "Waiting for Postgres..."
i=0
while [ "$i" -lt 30 ]; do
  if [ "$(docker inspect --format='{{.State.Health.Status}}' deckvault-postgres 2>/dev/null)" = "healthy" ]; then
    break
  fi
  i=$((i + 1))
  sleep 2
done

export DATABASE_URL="postgresql://deckvault:deckvault@localhost:5432/deckvault"
echo "Pushing Drizzle schema..."
npm run db:push

echo "Seeding demo collections and cards..."
node scripts/seed-demo-data.mjs

echo ""
echo "Ready!"
echo "  Adminer: http://localhost:8080"
echo "  Login: postgres / deckvault / deckvault / deckvault"
