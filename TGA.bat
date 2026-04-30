@echo off
cd /d "%~dp0"
cls
echo.
echo ===============================================
echo     TGA Ballot - Development Server
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

pause
