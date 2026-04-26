# 📋 TGA Ballot - Developer Playbook

Este archivo es una extensión del ReactAgent y sirve como referencia rápida para desarrollo y mantenimiento futuro.

## 🎯 Quick Commands

### Windows - Scripts Automáticos (Recomendado)

```bash
# Desarrollo (abre navegador automáticamente)
dev.bat

# Setup + Desarrollo (instala deps + inicia servidor)
setup-dev.bat

# Build para Cloudflare
build-cloudflare.bat
```

### NPM Manual

```bash
# Desarrollo
npm run dev           # Inicia servidor local (http://localhost:5173)

# Build
npm run build         # Crea carpeta dist/ para producción
npm run preview       # Previsualiza la build localmente

# Dependencias
npm install           # Instala todas las dependencias
npm update            # Actualiza a versiones compatibles
npm audit             # Busca vulnerabilidades de seguridad
```

## 🔧 Yearly Maintenance Checklist

Antes del 1 de noviembre cada año, ejecuta:

- [ ] **1. Verificar categorías**
  - Obtén lista oficial de nominados de The Game Awards
  - Actualiza `src/data/categories.js` con nuevas categorías
  - Prueba cada categoría en el navegador (mobile + desktop)

- [ ] **2. Actualizar textos (si es necesario)**
  - Revisa `src/data/literals.js` por errores ortográficos
  - Actualiza año en `appText.title` si cambia

- [ ] **3. Verificar deadline**
  - Confirma que el 1 de diciembre está correcto en `src/App.jsx`
  - Prueba que la votación se cierra el 1 de diciembre

- [ ] **4. Revisar seguridad**
  - Confirma que las reglas Firestore son correctas
  - Verifica que solo UID autenticados pueden escribir

- [ ] **5. Test en dispositivos reales**
  - Prueba en iPhone (small screen)
  - Prueba en iPad (medium screen)
  - Prueba en Desktop

- [ ] **6. Build & Deploy**
  - `npm run build`
  - Despliega en tu hosting (Vercel/Netlify/Firebase Hosting)

- [ ] **7. Verificar Firestore**
  - Limpia registros de prueba en Firebase Console
  - Verifica que la colección `ballots` está vacía o limpia

## 📁 File Edit Guide (Rápido)

### Para cambiar categorías
**Archivo**: `src/data/categories.js`  
**Acción**: Reemplaza el array `categories` completamente

### Para cambiar textos
**Archivo**: `src/data/literals.js`  
**Acción**: Modifica valores en el objeto `appText`

### Para cambiar la fecha de deadline
**Archivo**: `src/App.jsx`  
**Busca**: `now.getMonth() === 11 && now.getDate() >= 1`  
**Nota**: Mes 11 = Diciembre, getDate() >= 1 = a partir del 1º

### Para cambiar colores/estilos
**Archivo**: `tailwind.config.js` o `src/index.css`  
**Opción A**: Usa Tailwind utilities en `src/App.jsx`  
**Opción B**: Extiende theme en `tailwind.config.js`

## 🐛 Debugging Common Issues

### "No aparecen las categorías"
1. Abre DevTools (F12) > Console
2. Verifica si hay errores rojos
3. Comprueba que `src/data/categories.js` tiene estructura válida
4. Verifica que App.jsx importa categories correctamente

### "La votación no se guarda"
1. DevTools > Application > Firestore (si está instalada extensión)
2. O: Firebase Console > Firestore Database > ballots
3. Verifica que hay un documento nuevo con tu UID

### "Mobile layout está roto"
1. DevTools > Device Toolbar (Ctrl+Shift+M)
2. Cambia a iPhone SE (320px)
3. Verifica clases Tailwind usan breakpoints: `p-4 md:p-8`
4. Busca texto que no cabe o botones muy pequeños

### "Deadline check no funciona"
1. Abre Console en DevTools
2. Escribe: `new Date().getMonth()` (debe ser 11 para diciembre)
3. Escribe: `new Date().getDate()` (debe ser >= 1)

## 📊 Firestore Queries (Firebase Console)

### Ver todos los votos
```
Collection: ballots
Filter: isActive == true
Order by: submittedAt (descending)
```

### Ver votos de un usuario
```
Collection: ballots
Filtro: userEmail == "user@gmail.com"
```

### Contar votos por categoría
```javascript
// En Firebase Console > Firestore > queries
db.collection('ballots')
  .where('isActive', '==', true)
  .get()
  .then(snap => {
    const votes = {};
    snap.forEach(doc => {
      const data = doc.data();
      Object.entries(data.selections).forEach(([category, choice]) => {
        votes[category] = votes[category] || {};
        votes[category][choice] = (votes[category][choice] || 0) + 1;
      });
    });
    console.table(votes);
  });
```

## 🚀 Deployment Checklist

Antes de desplegar a producción:

- [ ] Tests locales completados (`npm run dev`)
- [ ] Build sin errores (`npm run build`)
- [ ] `dist/` folder tiene archivos (verifica tamaño)
- [ ] Credenciales Firebase actualizadas en `src/firebase.js`
- [ ] Reglas Firestore publicadas en la consola
- [ ] Variables de entorno configuradas (.env si las hay)
- [ ] Dominio autorizado en Firebase > Authentication > Authorized Domains
- [ ] Se puede hacer login con Google (prueba real)
- [ ] Categoria 1 funciona correctamente
- [ ] Envío de voto funciona
- [ ] Datos aparecen en Firestore

## 📝 Creating a Release

### Versioning
Usa [Semantic Versioning](https://semver.org/):
- `1.0.0` = v1, categorías de 2024
- `1.1.0` = Añadida admin dashboard
- `2.0.0` = Reescrita mayor (breaking changes)

### Release Process
1. Actualiza `package.json` versión
2. Crea tag git: `git tag v1.0.0`
3. Escribe release notes en GitHub
4. Deploy a producción

### Deploy a Cloudflare Pages
```bash
# 1. Commit y push a main
git add .
git commit -m "chore: bump version to 1.0.0"
git push origin main

# 2. Cloudflare automáticamente:
#    - Detecta el push
#    - Ejecuta: npm install && npm run build
#    - Despliega la carpeta dist/
#    - Tu sitio está en vivo en: tga-ballot.pages.dev
```

## 🌐 Cloudflare Deployment

### Primera Vez Setup
Sigue [DEPLOYMENT.md](DEPLOYMENT.md) paso a paso.

### Deployments Automáticos
- Cada vez que haces `git push origin main`
- Cloudflare automáticamente:
  1. Clona tu repo
  2. Ejecuta: `npm run build`
  3. Sube `dist/` a su CDN
  4. Tu sitio está en vivo en 30-60 segundos

### Ver Deployments
```
https://dash.cloudflare.com
→ Pages → tu-proyecto → Deployments
```

### Rollback Rápido
Si algo sale mal:
1. Cloudflare Dashboard > Deployments
2. Selecciona un deployment anterior
3. Click "Rollback"

### Custom Domain
```
Cloudflare Dashboard > Pages > Tu Proyecto > Settings > Domains
Añade tu dominio personalizado (ej: mi-porra.com)
```

## 🔐 Security Notes

### Firebase Rules - Nunca olvides
```plaintext
allow write: if request.auth != null && request.auth.uid == userId;
```
Sin esto, cualquiera puede editar/borrar votos de otros.

### Environment Variables
Si necesitas secretos (nunca hagas commit de credenciales):
```bash
# .env.local (add to .gitignore)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=yyy
```

### Rate Limiting
Firestore por defecto permite ~1M lecturas/día gratis. Si tienes spike de tráfico:
- Considera caching en client
- O pasa a Firebase Blaze plan (pay as you go)

## 📞 Support URLs

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Dashboard](https://dash.cloudflare.com)

## 📚 Documentación Completa

Archivos importantes en este proyecto:

| Archivo | Propósito |
|---|---|
| `SETUP.md` | Instalación inicial (7 pasos) |
| `README.md` | Documentación completa |
| `DEPLOYMENT.md` | Guía de deployment (Cloudflare + Firebase) |
| `CLOUDFLARE.md` | Configuración específica de Cloudflare |
| `PLAYBOOK.md` | Este archivo (operaciones y mantenimiento) |
| `.env.example` | Variables de entorno template |
| `dev.bat` | Script para desarrollo rápido (Windows) |
| `build-cloudflare.bat` | Build automático para Cloudflare (Windows) |
| `setup-dev.bat` | Setup + Dev en un paso (Windows) |

## 🎓 Training New Developers

1. **Day 1**: Lee SETUP.md + README.md
2. **Day 2**: Ejecuta `npm run dev` + explora código
3. **Day 3**: Modifica categorías en `src/data/categories.js`
4. **Day 4**: Añade un componente nuevo (e.g., ResultsCard.jsx)
5. **Day 5**: Deploy a staging y prueba E2E

## 📌 Important Notes

- **Never hardcode data** in components
- **Always test mobile** (real device, not just DevTools)
- **camelCase is law** (consistency reduces bugs)
- **Firebase UID is source of truth** (not nickname, not email)
- **localStorage is UI-only** (Firestore is the real database)

---

**Last Updated**: 2024-10-15  
**Maintained By**: [Your Team]  
**Questions?** Check SETUP.md or README.md first
