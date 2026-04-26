@echo off
REM ============================================
REM TGA Ballot - Development Server Launcher
REM Automatiza la apertura y setup del proyecto
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════╗
echo ║   TGA Ballot - Development Launcher    ║
echo ╚════════════════════════════════════════╝
echo.

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no está instalado o no está en PATH
    echo.
    echo Descargalo desde: https://nodejs.org/
    echo Después, reinicia esta ventana.
    pause
    exit /b 1
)

echo ✓ Node.js detectado: 
for /f "tokens=*" %%i in ('node --version') do echo   %%i

REM Verificar si npm está instalado
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: npm no está instalado
    pause
    exit /b 1
)

echo ✓ npm detectado: 
for /f "tokens=*" %%i in ('npm --version') do echo   %%i
echo.

REM Verificar si node_modules existe
if not exist "node_modules" (
    echo 📦 Instalando dependencias (primera vez)...
    echo.
    call npm install
    if errorlevel 1 (
        echo ❌ Error durante npm install
        pause
        exit /b 1
    )
    echo ✓ Dependencias instaladas correctamente
    echo.
) else (
    echo ✓ node_modules ya existe (saltando npm install)
    echo.
)

REM Limpiar archivos temporales de Vite (opcional)
if exist ".vite" (
    echo 🧹 Limpiando caché de Vite...
    rmdir /s /q .vite >nul 2>&1
)

REM Definir puerto
set PORT=5173
set URL=http://localhost:%PORT%

echo 🚀 Iniciando servidor de desarrollo...
echo.
echo 📍 La app estará disponible en: %URL%
echo.
echo ⏳ Esperando a que el servidor esté listo...
echo.

REM Esperar un poco para que el servidor se inicie
timeout /t 2 /nobreak

REM Abrir navegador automáticamente
echo 🌐 Abriendo navegador...
start "" "%URL%"

REM Iniciar el servidor
echo.
echo ▶ Ejecutando: npm run dev
echo.
echo 💡 Presiona Ctrl+C para detener el servidor
echo.
call npm run dev

pause
