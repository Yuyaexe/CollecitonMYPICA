@echo off
setlocal enabledelayedexpansion
title DeckVault - Verificador
cd /d "%~dp0"

echo ========================================
echo   DeckVault - Verificador de Saude
echo ========================================
echo.
echo Este script verifica:
echo   - Node.js e dependencias
echo   - .env.local / CardTrader API token
echo   - URLs CardTrader (passcode vs blueprint)
echo   - Imagens Yu-Gi-Oh (regras de ID)
echo   - ESLint / TypeScript
echo   - Conexao opcional com CardTrader API
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js nao instalado.
    echo Instale Node.js 20+ em https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Instalando dependencias...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] npm install falhou.
        pause
        exit /b 1
    )
)

if exist ".verify-result" del /f /q ".verify-result" >nul 2>nul

echo.
node scripts/verify-deckvault.mjs

REM Prefer result file — Node on Windows can crash on exit after async I/O
set VERIFY_EXIT=1
if exist ".verify-result" (
    set /p VERIFY_RESULT=<.verify-result
    del /f /q ".verify-result" >nul 2>nul
    if /i "!VERIFY_RESULT!"=="PASS" set VERIFY_EXIT=0
    if /i "!VERIFY_RESULT!"=="FAIL" set VERIFY_EXIT=1
) else (
    set VERIFY_EXIT=%ERRORLEVEL%
)

echo.
if %VERIFY_EXIT% equ 0 (
    echo ========================================
    echo   Todas as verificacoes passaram!
    echo ========================================
) else (
    echo ========================================

    echo   Algumas verificacoes FALHARAM.

    echo   Leia a saida acima para detalhes.

    echo ========================================

    echo.

    echo Dicas comuns:

    echo   - URL CardTrader 404: externalId era passcode YGO, nao blueprint

    echo   - Imagem errada: limpe cache do navegador ^(Ctrl+Shift+R^)

    echo   - Demo antigo: abra o app uma vez para migrar cardTraderBlueprintId

    echo   - Precos CardTrader: configure CARDTRADER_API_TOKEN no .env.local

)

echo.
pause
exit /b %VERIFY_EXIT%
