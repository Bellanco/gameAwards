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

REM Iniciar servidor de desarrollo en otra ventana
echo.
echo ▶ Ejecutando: npm run dev
echo 💡 Usa Ctrl+C en la ventana del servidor para detener
echo.

REM Iniciar npm run dev en una ventana separada
start "TGA Ballot - Dev Server" cmd /k npm run dev

REM Esperar a que el servidor esté listo (3-5 segundos aproximadamente)
echo ⏳ Esperando a que el servidor inicie...
timeout /t 3 /nobreak

REM Abrir el navegador
echo 🌐 Abriendo navegador en %URL%
start "" "%URL%"

echo.
echo ✓ Servidor iniciado y navegador abierto
echo.
echo 📍 URL: %URL%
echo.
pause
