@echo off
setlocal enabledelayedexpansion
title DeckVault - Teste YGO Imagens
cd /d "%~dp0"

echo ========================================
echo   DeckVault - Teste Yu-Gi-Oh Imagens
echo ========================================
echo.
echo Este script testa:
echo   - Resolucao de passcodes em lote ^(resolve-batch^)
echo   - Resolucao individual por nome / set code
echo   - Imagens YGOPRODeck para cartas aleatorias
echo   - Regressoes: Draco Berserker, Mirrorjade, Vessel, etc.
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

set BASE_URL=http://localhost:3000
set RANDOM_COUNT=24

if not "%~1"=="" set BASE_URL=%~1
if not "%~2"=="" set RANDOM_COUNT=%~2

echo Base URL: %BASE_URL%
echo Cartas aleatorias por execucao: %RANDOM_COUNT%
echo.

curl -s %BASE_URL% >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Servidor nao esta rodando. Iniciando npm run dev...
    echo.

    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul

    start /b cmd /c "npm run dev > deckvault-test.log 2>&1"

    echo Aguardando servidor ^(ate 60s^)...
    set /a count=0
    :waitloop
    timeout /t 1 /nobreak >nul
    set /a count+=1
    curl -s %BASE_URL% >nul 2>nul
    if !ERRORLEVEL! equ 0 goto serverready
    if !count! geq 60 (
        echo [ERRO] Servidor nao subiu a tempo.
        echo Veja deckvault-test.log
        pause
        exit /b 1
    )
    goto waitloop

    :serverready
    echo Servidor pronto!
    echo.
)

if exist ".ygo-test-result" del /f /q ".ygo-test-result" >nul 2>nul

node scripts/test-yugioh-passcodes.mjs --base-url %BASE_URL% --random %RANDOM_COUNT%

set TEST_EXIT=1
if exist ".ygo-test-result" (
    set /p TEST_RESULT=<.ygo-test-result
    del /f /q ".ygo-test-result" >nul 2>nul
    if /i "!TEST_RESULT!"=="PASS" set TEST_EXIT=0
    if /i "!TEST_RESULT!"=="FAIL" set TEST_EXIT=1
) else (
    set TEST_EXIT=%ERRORLEVEL%
)

echo.
if %TEST_EXIT% equ 0 (
    echo ========================================
    echo   Testes YGO passaram!
    echo ========================================
) else (
    echo ========================================
    echo   Alguns testes YGO FALHARAM.
    echo   Leia a saida acima para detalhes.
    echo ========================================
    echo.
    echo Dicas:
    echo   - Confirme que o codigo mais recente esta deployado
    echo   - Rode de novo — cartas aleatorias mudam a cada execucao
    echo   - Teste producao: DeckVault-Test-YGO-Images.bat https://collection-mypica.vercel.app 8
)

echo.
pause
exit /b %TEST_EXIT%
