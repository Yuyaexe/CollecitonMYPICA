# Build DeckVault.exe (requires Rust + Tauri CLI)

Write-Host "Building DeckVault..." -ForegroundColor Cyan

# Next.js standalone build
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Tauri build
npm run tauri:build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "Executable: src-tauri\target\release\deckvault.exe"
Write-Host ""
Write-Host "Note: Unsigned .exe may trigger Windows SmartScreen on first run." -ForegroundColor Yellow
