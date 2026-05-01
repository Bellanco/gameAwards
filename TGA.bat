@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Default: dev frontend
if "%1%"=="" (
    npm run dev
    exit /b !errorlevel!
)

REM dev - Vite frontend only
if /i "%1%"=="dev" (
    npm run dev
    exit /b !errorlevel!
)

REM full - Full stack with Wrangler
if /i "%1%"=="full" (
    wrangler pages dev dist
    exit /b !errorlevel!
)

REM build - Production build
if /i "%1%"=="build" (
    npm run build
    exit /b !errorlevel!
)

REM deploy - Deploy to Cloudflare (git push)
if /i "%1%"=="deploy" (
    npm run build
    if !errorlevel! neq 0 exit /b 1
    git add .
    git commit -m "Deploy: Updated build"
    git push origin main
    exit /b !errorlevel!
)

REM clean - Clean and reinstall
if /i "%1%"=="clean" (
    if exist "node_modules" rmdir /s /q node_modules
    if exist "dist" rmdir /s /q dist
    npm install
    exit /b !errorlevel!
)

REM Help
echo.
echo Uso: TGA.bat [opción]
echo.
echo Opciones:
echo   (vacío)   Dev: Vite frontend
echo   dev       Dev: Vite frontend
echo   full      Dev: Full stack con Wrangler
echo   build     Build para producción
echo   deploy    Deploy a Cloudflare (git push)
echo   clean     Limpiar y reinstalar
echo.
exit /b 0
