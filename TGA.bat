@echo off
cd /d "%~dp0"
cls

:menu
echo.
echo ===============================================
echo     TGA Ballot - Development & Deployment
echo ===============================================
echo.
echo Opciones:
echo   1) Iniciar servidor de desarrollo (Vite)
echo   2) Iniciar Vercel dev (con serverless local)
echo   3) Build para producción
echo   4) Deploy a producción (Vercel)
echo   5) Limpiar cache y reiniciar
echo   6) Salir
echo.
set /p choice="Selecciona opción (1-6): "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto vercel_dev
if "%choice%"=="3" goto build
if "%choice%"=="4" goto deploy
if "%choice%"=="5" goto clean
if "%choice%"=="6" exit /b 0

echo.
echo Opción inválida. Intenta de nuevo.
echo.
goto menu

:dev
cls
echo.
echo ===============================================
echo     Iniciando servidor Vite (http://localhost:5173)
echo ===============================================
echo.
echo URL: http://localhost:5173
echo ADMIN: http://localhost:5173/admin
echo.
echo Para detener: Presiona Ctrl+C
echo.
echo ===============================================
echo.
npm run dev
goto end

:vercel_dev
cls
echo.
echo ===============================================
echo     Verificando Vercel CLI...
echo ===============================================
echo.

REM Verificar si vercel está instalado
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI no está instalado
    echo.
    echo Instalando Vercel CLI globalmente...
    npm install -g vercel
    if errorlevel 1 (
        echo ❌ Error instalando Vercel CLI
        pause
        goto menu
    )
    echo ✓ Vercel CLI instalado
    echo.
)

echo.
echo ===============================================
echo     Iniciando Vercel Dev (con serverless local)
echo ===============================================
echo.
echo Frontend: http://localhost:3000
echo API:      http://localhost:3000/api/games
echo.
echo Para detener: Presiona Ctrl+C
echo.
echo ✓ Esto permite testear el serverless localmente
echo ===============================================
echo.
vercel dev
goto end

:build
cls
echo.
echo ===============================================
echo     Building para producción...
echo ===============================================
echo.
npm run build
echo.
echo ✓ Build completado en ./dist/
echo.
pause
goto menu

:deploy
cls
echo.
echo ===============================================
echo     Verificando Vercel CLI...
echo ===============================================
echo.

REM Verificar si vercel está instalado
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI no está instalado
    echo.
    echo Instalando Vercel CLI globalmente...
    npm install -g vercel
    if errorlevel 1 (
        echo ❌ Error instalando Vercel CLI
        pause
        goto menu
    )
    echo ✓ Vercel CLI instalado
    echo.
)

cls
echo.
echo ===============================================
echo     Deploying a Vercel (Producción)
echo ===============================================
echo.
echo Asegúrate de que:
echo ✓ Variables de entorno están en Vercel
echo ✓ RAWG_API_KEY está configurada
echo.
vercel --prod
echo.
echo ✓ Deploy completado
echo.
pause
goto menu

:clean
cls
echo.
echo ===============================================
echo     Limpiando cache...
echo ===============================================
echo.
if exist "node_modules" (
    echo Limpiando node_modules...
    rmdir /s /q node_modules
)
echo Limpiando localStorage del navegador...
echo.
echo npm install
npm install
echo.
echo ✓ Cache limpiado. Servidor reiniciado.
echo.
goto dev

:end
echo.
echo Presiona cualquier tecla para volver al menú...
pause
goto menu
