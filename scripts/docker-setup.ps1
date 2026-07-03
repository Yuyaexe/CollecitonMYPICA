$ErrorActionPreference = "Stop"

Write-Host "Starting DeckVault Docker stack..." -ForegroundColor Cyan
docker compose up -d postgres adminer

Write-Host "Waiting for Postgres..." -ForegroundColor Yellow
$retries = 30
for ($i = 0; $i -lt $retries; $i++) {
  $healthy = docker inspect --format='{{.State.Health.Status}}' deckvault-postgres 2>$null
  if ($healthy -eq "healthy") { break }
  Start-Sleep -Seconds 2
}
if ($healthy -ne "healthy") {
  Write-Host "Postgres did not become healthy in time." -ForegroundColor Red
  exit 1
}

$env:DATABASE_URL = "postgresql://deckvault:deckvault@localhost:5432/deckvault"
Write-Host "Pushing Drizzle schema..." -ForegroundColor Cyan
npm run db:push

Write-Host "Seeding demo collections and cards..." -ForegroundColor Cyan
node scripts/seed-demo-data.mjs

Write-Host ""
Write-Host "Ready!" -ForegroundColor Green
Write-Host "  Adminer (view DB):  http://localhost:8080"
Write-Host "    System: PostgreSQL | Server: postgres | User: deckvault | Password: deckvault | Database: deckvault"
Write-Host "  Drizzle Studio:     npm run db:studio"
Write-Host "  App (local):        npm run dev  (set DATABASE_URL in .env.local)"
Write-Host "  App (Docker):       docker compose --profile full up -d app"
