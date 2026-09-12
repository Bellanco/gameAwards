@echo off
REM Verificar si node_modules existe; si no, instalar dependencias
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo Error al instalar dependencias.
        pause
        exit /b 1
    )
)
echo Iniciando servidor de desarrollo...
call npm run dev
pause
