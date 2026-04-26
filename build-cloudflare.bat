@echo off
REM ============================================
REM TGA Ballot - Build & Cloudflare Deploy
REM Prepara el proyecto para Cloudflare Pages
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════╗
echo ║   TGA Ballot - Build for Cloudflare    ║
echo ╚════════════════════════════════════════╝
echo.

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no instalado
    pause
    exit /b 1
)

echo ✓ Node.js detectado
echo.

REM Verificar si node_modules existe
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo ❌ Error en npm install
        pause
        exit /b 1
    )
)

echo.
echo 🔨 Compilando proyecto...
echo.

REM Build
call npm run build
if errorlevel 1 (
    echo ❌ Error durante build
    pause
    exit /b 1
)

echo.
echo ✓ Build completado exitosamente
echo.

REM Verificar carpeta dist
if not exist "dist" (
    echo ❌ ERROR: Carpeta dist no encontrada
    pause
    exit /b 1
)

echo 📊 Tamaño de dist:
for /f "tokens=*" %%i in ('dir /s /b dist ^| find /c /v ""') do (
    echo   %%i archivos en dist/
)

echo.
echo ✅ Listo para desplegar en Cloudflare Pages
echo.
echo 📝 Próximos pasos:
echo.
echo   1. Ve a: https://dash.cloudflare.com
echo   2. Selecciona: Pages ^> Create a project
echo   3. Conecta tu repositorio de Git
echo   4. Build Command: npm run build
echo   5. Build Output Directory: dist
echo.
echo 🚀 ¿Necesitas comprometer cambios?
echo   git add .
echo   git commit -m "Build for Cloudflare"
echo   git push
echo.

pause
