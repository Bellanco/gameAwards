# ✅ Deployment Checklist - TGA Ballot

Copia este checklist y complétalo antes de cada deployment.

---

## 🔍 Pre-Deployment (Local Testing)

- [ ] Código probado localmente: `dev.bat` sin errores
- [ ] DevTools Console limpia (F12) - sin errores rojos
- [ ] Firebase auth funciona (puedo hacer login con Google)
- [ ] Todas las categorías se cargan correctamente
- [ ] Puedo votar en cada categoría
- [ ] Al enviar, aparece pantalla de éxito
- [ ] Datos aparecen en Firestore (Firebase Console)
- [ ] Responsive probado:
  - [ ] iPhone (320px)
  - [ ] iPad (768px)
  - [ ] Desktop (1024px+)

---

## 🏗️ Build Phase

- [ ] Ejecuté: `build-cloudflare.bat`
- [ ] Build terminó SIN errores
- [ ] Carpeta `dist/` existe y tiene archivos
- [ ] Ver tamaño: `dist/` no debe estar vacía

---

## 📝 Code Quality

- [ ] No hay `console.log()` de debug restantes
- [ ] Todas las variables siguen camelCase
- [ ] No hay hardcoded URLs o keys
- [ ] Firebase rules verificadas en `.github/firestore.rules`
- [ ] `.env.local` tiene credenciales correctas

---

## 🔐 Security Check

- [ ] Firebase UID enforcement en Firestore rules: ✓
- [ ] No hay secretos en código
- [ ] `.env.local` NO está en git (check `.gitignore`)
- [ ] HTTPS/SSL será manejado por Cloudflare

---

## 📊 Categorías & Datos

- [ ] `src/data/categories.js` tiene todas las categorías 2024
- [ ] `src/data/literals.js` tiene textos correctos
- [ ] Año en título es correcto
- [ ] Deadline (1 de diciembre) está en `src/App.jsx`

---

## 🌐 Cloudflare Setup (Primera vez solo)

- [ ] Cloudflare Pages conectado a repo Git
- [ ] Build command: `npm run build` ✓
- [ ] Build output: `dist` ✓
- [ ] Variables de entorno agregadas en Cloudflare Dashboard:
  - [ ] VITE_FIREBASE_API_KEY
  - [ ] VITE_FIREBASE_AUTH_DOMAIN
  - [ ] VITE_FIREBASE_PROJECT_ID
  - [ ] VITE_FIREBASE_STORAGE_BUCKET
  - [ ] VITE_FIREBASE_MESSAGING_SENDER_ID
  - [ ] VITE_FIREBASE_APP_ID

---

## 💾 Git Commit

- [ ] Git status limpio: `git status`
- [ ] Cambios comiteados: `git add .` + `git commit -m "..."`
- [ ] Commit message descriptivo
- [ ] NO hay cambios sin commitear

---

## 🚀 Push a Producción

```bash
git push origin main
```

- [ ] Push completado sin errores
- [ ] GitHub/GitLab muestra el push

---

## 🔄 Cloudflare Deploy

- [ ] Ve a: https://dash.cloudflare.com
- [ ] Pages > tu-proyecto > Deployments
- [ ] Nuevo deployment aparece (en construcción)
- [ ] Build termina (mira logs si falla)
- [ ] Status: "Deployed" ✓
- [ ] URL en vivo: tga-ballot.pages.dev

---

## ✨ Post-Deploy Verification

- [ ] App carga en navegador (tga-ballot.pages.dev)
- [ ] loading.html aparece brevemente
- [ ] React app carga
- [ ] Login con Google funciona
- [ ] Puedo votar
- [ ] Al enviar, se guarda en Firestore
- [ ] DevTools Console sin errores

---

## 🔗 Autorizar Dominio en Firebase

Si acabas de desplegar, actualiza Authorized Domains:

1. Firebase Console > Authentication > Settings
2. Authorized domains > Add domain
3. Agrega: `tga-ballot.pages.dev`
4. Si usas dominio personalizado, agrega también

---

## 🔙 Rollback (Si algo falla)

```
Cloudflare Dashboard > Deployments > Selecciona anterior > Rollback
```

O con Git:
```bash
git revert <commit-hash>
git push origin main
```

---

## 📞 Si Falla

1. Ver logs: Cloudflare > Deployments > Selecciona el fallido > View logs
2. Errores comunes:
   - `Cannot find module`: Falta dependencia en `package.json`
   - `ENOENT`: Archivo no existe
   - `Firebase error`: Credenciales incorrectas

3. Solución rápida:
   - Ejecuta `setup-dev.bat` localmente
   - Verifica todo funciona
   - Haz nuevo push

---

## 📊 Monitoreo Post-Deploy

- [ ] Visita el sitio todos los días (primeros 3 días)
- [ ] Verifica que los votos se guardan
- [ ] Check Cloudflare Analytics (opcional)
- [ ] Monitorea Firestore para crecimiento

---

## 🎯 Checklist Semanal (Si tienes cambios)

```
Lunes: dev.bat ✓
Miércoles: Cambios + build-cloudflare.bat ✓
Viernes: git push → Cloudflare despliega ✓
```

---

## 📝 Notas

```
Deployment: [Fecha]
Build time: [Minutos]
Issues: [Ninguna / Describe]
Firebase votes: [Número aproximado]
```

---

**Cuando todo pase este checklist → ¡Listo para producción! 🚀**

Guarda este archivo para reutilizar en futuros deployments.
