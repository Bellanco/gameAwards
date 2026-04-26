@echo off
REM ============================================
REM TGA Ballot - Quick Setup
REM Setup + Desarrollo en un paso
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════╗
echo ║   TGA Ballot - Setup + Development     ║
echo ╚════════════════════════════════════════╝
echo.

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no está instalado
    echo Descargalo desde: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js listo
echo.

REM Limpiar instalaciones previas (opcional)
if exist "node_modules" (
    echo 🧹 Eliminando node_modules anterior...
    rmdir /s /q node_modules >nul 2>&1
)

if exist "package-lock.json" (
    del /q package-lock.json >nul 2>&1
)

echo.
echo 📦 Instalando dependencias...
call npm install

if errorlevel 1 (
    echo ❌ Error durante instalación
    pause
    exit /b 1
)

echo.
echo ✓ ¡Instalación completada!
echo.

REM Abrir dev server
echo 🚀 Iniciando servidor...
timeout /t 2 /nobreak

start "" http://localhost:5173

call npm run dev

pause
