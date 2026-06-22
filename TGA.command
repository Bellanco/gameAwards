#!/bin/bash
# Lanzador local para macOS (doble clic en Finder).
# Equivalente a TGA.bat: abre el navegador y arranca el servidor de desarrollo.
cd "$(dirname "$0")" || exit 1

# Instalar dependencias la primera vez
[ -d node_modules ] || npm install

# Abrir el navegador tras un breve retardo (da tiempo a que Vite arranque)
( sleep 3 && open http://localhost:5173 ) &

npm run dev
