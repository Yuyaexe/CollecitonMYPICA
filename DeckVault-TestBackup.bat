@echo off
setlocal enabledelayedexpansion
title DeckVault - Teste de Backup
cd /d "%~dp0"

echo ========================================
echo   DeckVault - Teste de Import de Backup
echo ========================================
echo.
echo Verifica o arquivo yugioh-backup-*.json:
echo   - JSON valido e formato CardTrader
echo   - Conversao com o mesmo codigo do app
echo   - Contagem de cartas e colecoes
echo   - Tamanho do payload para API Supabase
echo.
echo Uso opcional: DeckVault-TestBackup.bat caminho\arquivo.json
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

if exist ".verify-backup-result" del /f /q ".verify-backup-result" >nul 2>nul

echo.
if "%~1"=="" (
    node scripts/verify-backup-import.mjs
) else (
    node scripts/verify-backup-import.mjs "%~1"
)

set TEST_EXIT=1
if exist ".verify-backup-result" (
    set /p TEST_RESULT=<.verify-backup-result
    del /f /q ".verify-backup-result" >nul 2>nul
    if /i "!TEST_RESULT!"=="PASS" set TEST_EXIT=0
    if /i "!TEST_RESULT!"=="FAIL" set TEST_EXIT=1
) else (
    set TEST_EXIT=%ERRORLEVEL%
)

echo.
if %TEST_EXIT% equ 0 (
    echo ========================================
    echo   Backup OK — pode importar no app!
    echo   Settings ^> Restaurar backup
    echo ========================================
) else (
    echo ========================================
    echo   Teste FALHOU — veja os erros acima.
    echo ========================================
    echo.
    echo Dicas:
    echo   - Arquivo na raiz: yugioh-backup-....json
    echo   - Reinicie o app apos atualizar o codigo
    echo   - Modo demo: sem .env.local ^(restore local^)
)

echo.
pause
exit /b %TEST_EXIT%
