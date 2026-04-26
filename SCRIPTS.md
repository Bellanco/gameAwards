# 🪟 Windows Batch Scripts - TGA Ballot

Estos scripts automatizan tareas comunes en Windows. Simplemente haz doble clic para ejecutar.

## 📋 Disponibles

### 1. `dev.bat` - Desarrollo Rápido ⭐ RECOMENDADO

**¿Qué hace?**
- ✅ Verifica que Node.js está instalado
- ✅ Instala dependencias si es la primera vez
- ✅ Inicia el servidor de desarrollo
- ✅ Abre tu navegador automáticamente en `http://localhost:5173`

**Cuándo usarlo:**
- Todos los días para desarrollo
- Pruebas locales
- Before committing changes

**Cómo:**
1. Abre la carpeta del proyecto
2. Haz doble clic en `dev.bat`
3. Espera a que se abra el navegador
4. ¡Listo! Ya puedes empezar a desarrollar

**Para detener:**
- Presiona `Ctrl+C` en la ventana del terminal

---

### 2. `setup-dev.bat` - Setup Completo

**¿Qué hace?**
- ✅ Elimina `node_modules` anterior (si existe)
- ✅ Limpia `package-lock.json`
- ✅ Instala todas las dependencias (limpio)
- ✅ Inicia servidor de desarrollo

**Cuándo usarlo:**
- Primera instalación
- Si algo falla con `dev.bat`
- Después de actualizar `package.json`
- Cuando algo está roto

**Cómo:**
1. Haz doble clic en `setup-dev.bat`
2. Espera (puede tardar 2-5 minutos la primera vez)
3. Se abrirá automáticamente en el navegador

---

### 3. `build-cloudflare.bat` - Build para Producción

**¿Qué hace?**
- ✅ Instala dependencias
- ✅ Compila el proyecto con `npm run build`
- ✅ Verifica que `dist/` se creó correctamente
- ✅ Muestra información de deployment

**Cuándo usarlo:**
- Antes de desplegar en Cloudflare
- Antes de commitear a `main`
- Para probar que el build no tiene errores

**Cómo:**
1. Haz doble clic en `build-cloudflare.bat`
2. Espera a que termine
3. Verás un mensaje con próximos pasos
4. Podrás hacer git push

**Resultado:**
```
✓ Build completado exitosamente

📊 Tamaño de dist:
   42 archivos en dist/

✅ Listo para desplegar en Cloudflare Pages

📝 Próximos pasos:

   1. Ve a: https://dash.cloudflare.com
   2. Selecciona: Pages > Create a project
   ...
```

---

## 🔧 Troubleshooting

### El script no se ejecuta (solo se abre una ventana)

**Problema:** "No se reconoce 'npm'" o similar

**Solución 1:** Node.js no está en PATH
- Reinstala Node.js desde https://nodejs.org/
- Asegúrate de marcar "Add to PATH" durante instalación
- Reinicia Windows

**Solución 2:** Ejecutar desde Command Prompt
```bash
cd "C:\Path\To\Game Awards"
.\dev.bat
```

### El script se cierra inmediatamente

**Problema:** Algún comando falla

**Solución:** Ejecutar manualmente
```bash
# Abre cmd y ejecuta:
cd "C:\Path\To\Game Awards"
npm run dev
```

Verás el error exacto.

### "Cannot find module 'vite'"

**Solución:**
1. Ejecuta `setup-dev.bat` nuevamente
2. O: `npm install` en terminal

### Port 5173 already in use

**Problema:** Otro proceso usa el puerto

**Soluciones:**
```bash
# Opción 1: Usar otro puerto
npm run dev -- --port 5174

# Opción 2: Cerrar lo que use el puerto
# Busca en Task Manager (Ctrl+Shift+Esc) y mata el proceso
```

---

## 📝 Editar los Scripts

Los scripts están en formato `.bat` (Batch). Puedes editarlos con:
- Notepad (click derecho > Edit)
- Visual Studio Code
- Cualquier editor de texto

**Estructura básica:**
```batch
@echo off
REM Esto es un comentario
echo Mensaje en pantalla
call npm run dev
pause
```

### Cambiar el puerto (si necesitas)
En `dev.bat`, busca:
```batch
set PORT=5173
```

Cámbialo a:
```batch
set PORT=3000
```

---

## 🚀 Workflow Típico

### Mañana - Empezar a Desarrollar
```
1. Doble clic en dev.bat
2. Espera navegador
3. Edita código
4. Se auto-recompila (Vite)
5. Refresca navegador (Ctrl+R)
```

### Tarde - Antes de Commitear
```
1. Doble clic en build-cloudflare.bat
2. Si no hay errores: ✓
3. git add .
4. git commit -m "message"
5. git push origin main
```

### Viernes - Deploy
```
1. build-cloudflare.bat ✓
2. git push origin main
3. Cloudflare automáticamente despliega
4. Verifica en https://dash.cloudflare.com
5. ¡Listo!
```

---

## 💡 Pro Tips

### Ejecutar desde PowerShell/Terminal
En lugar de doble clic, puedes usar terminal para más control:

```powershell
# PowerShell (Windows 10+)
.\dev.bat

# O desde cmd:
dev.bat
```

### Ejecutar sin pausa al final
Si no quieres que el script espere presionar Enter:
- Abre el `.bat` con editor
- Busca la última línea: `pause`
- Cámbiala a: `REM pause` (comentado)
- Guarda

### Crear tus propios scripts
Copia uno existente y modifica:

```batch
@echo off
echo Mi script personalizado
call npm run build
call npm run preview
pause
```

---

## 📞 Referencia de Comandos

Si prefieres terminal en lugar de .bat:

| Tarea | Comando |
|---|---|
| Desarrollo | `npm run dev` |
| Build | `npm run build` |
| Preview | `npm run preview` |
| Instalar deps | `npm install` |
| Actualizar deps | `npm update` |
| Auditar seguridad | `npm audit` |

---

## ✅ Checklist

- [ ] Node.js v16+ instalado (`node --version`)
- [ ] npm funciona (`npm --version`)
- [ ] Los scripts .bat están en la carpeta raíz
- [ ] Ejecuta `dev.bat` sin errores
- [ ] Navegador abre en http://localhost:5173
- [ ] Puedes ver la app cargando

---

**¿Necesitas ayuda?** Abre una issue o consulta SETUP.md y DEPLOYMENT.md.
