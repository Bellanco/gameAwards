# 🚀 Deployment Guide - TGA Ballot

Guía completa para desplegar TGA Ballot en Cloudflare Pages, producción y staging.

## 📋 Pre-Deployment Checklist

- [ ] Código probado localmente (`npm run dev`)
- [ ] Todos los tests pasan
- [ ] No hay console errors (F12)
- [ ] Firebase credenciales configuradas
- [ ] `.env.local` tiene valores correctos
- [ ] Build sin errores (`npm run build`)
- [ ] `dist/` folder fue generado
- [ ] Cambios comiteados a git

## 🌐 Opción 1: Cloudflare Pages (Recomendado)

### Ventajas
- ✅ Gratis (generoso free tier)
- ✅ CDN global automático
- ✅ SSL/HTTPS incluido
- ✅ Deploy automático en cada push
- ✅ Funciones serverless opcionales
- ✅ 100% compatible con Vite

### Paso 1: Preparar Repositorio Git

```bash
# Asegúrate de tener git configurado
git config --global user.email "tu@email.com"
git config --global user.name "Tu Nombre"

# Inicializar repo (si no está)
git init
git add .
git commit -m "Initial commit: TGA Ballot setup"

# Agregar remote (reemplaza con tu repo)
git remote add origin https://github.com/tu-usuario/tga-ballot.git
git branch -M main
git push -u origin main
```

### Paso 2: Conectar Cloudflare

1. Ve a https://dash.cloudflare.com
2. Accede con tu cuenta Cloudflare
   - Si no tienes, regístrate gratis
3. Ve a **Pages** en el menú izquierdo
4. Click en **"Create a project"**
5. Click en **"Connect to Git"**
6. Selecciona tu proveedor:
   - GitHub
   - GitLab
   - Gitea
7. Autoriza a Cloudflare a acceder a tus repositorios
8. Selecciona `tga-ballot` (o tu repo)

### Paso 3: Configurar Build

**Cloudflare detectará automáticamente Vite, pero verifica:**

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |

### Paso 4: Añadir Variables de Entorno

En Cloudflare Dashboard:

1. Tu Proyecto > **Settings** > **Environment variables**
2. Añade para **Production**:

```
VITE_FIREBASE_API_KEY = AIza...
VITE_FIREBASE_AUTH_DOMAIN = tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET = tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456...
VITE_FIREBASE_APP_ID = 1:123456:web:abc...
```

**Nota**: Obtén estos valores de Firebase Console > Project Settings

### Paso 5: Deploy

1. Click en **"Save and Deploy"**
2. Cloudflare construirá y desplegará automáticamente
3. Tu app estará disponible en: `https://tu-proyecto.pages.dev`

### Paso 6 (Opcional): Dominio Personalizado

1. Tu Proyecto > **Settings** > **Domains**
2. Click en **"Add custom domain"**
3. Escribe tu dominio: `mi-porra.com`
4. Sigue las instrucciones para actualizar DNS (CNAME)

## 🔄 Deployments Futuros

Después de la configuración inicial, **cada push a `main` desplegará automáticamente**:

```bash
# Hacer cambios
git add .
git commit -m "feat: add new category"
git push origin main

# Cloudflare se encargará del resto ✨
```

Ver deployments en: Tu Proyecto > **Deployments** > Selecciona un deployment

## 🚨 Debugging Deployments

### Build falla

1. Cloudflare Dashboard > Tu Proyecto > **Deployments**
2. Selecciona el deployment fallido
3. Click en **"View build logs"**
4. Busca el error

Causas comunes:
- Dependencies no instaladas: `npm install`
- Variables de entorno faltantes
- TypeScript errors

### App no se carga en producción

1. Abre DevTools (F12)
2. Consola > Busca errores rojos
3. Application > Storage > Verifica localStorage
4. Network tab > Verifica que los bundles se cargan

### Firebase errors en producción

1. Firebase Console > Authentication > Authorized domains
2. Añade: `tu-proyecto.pages.dev`
3. Si tienes dominio personalizado, añádelo también

## 🔒 Seguridad

### Credenciales

- ✅ USA `.env.local` para desarrollo
- ❌ NUNCA hagas commit de `.env.local`
- ✅ Usa Cloudflare env vars para producción
- ❌ NUNCA expongas API keys en código

### Firestore Rules

Verifica que las reglas son restrictivas:

```plaintext
allow read: if request.auth != null;
allow write: if request.auth != null && request.auth.uid == userId;
```

### Headers de Seguridad

Cloudflare añade automáticamente:
- HTTPS/TLS
- DDoS protection
- Rate limiting (opcional)

## 📊 Monitoreo

### Analítica

Cloudflare > Tu Proyecto > **Analytics** muestra:
- Requests totales
- Bandwidth usado
- Cache hit rate
- Errores

### Custom Domain Monitoring

Si usas dominio personalizado:
1. Cloudflare > Domain > **Analytics**
2. Monitorea DNS resoluciones, hits, etc

## 🔙 Rollback (Volver a Versión Anterior)

Si algo sale mal en producción:

1. Cloudflare > Tu Proyecto > **Deployments**
2. Encuentra un deployment anterior bueno
3. Click en **"Rollback to this deployment"**

O con git:

```bash
# Ver historial
git log --oneline

# Volver a un commit anterior
git revert <commit-hash>
git push origin main

# Cloudflare redesplegará automáticamente
```

## 🔨 Alternativa: Firebase Hosting

Si prefieres Firebase:

```bash
# Instalar CLI
npm install -g firebase-tools

# Login
firebase login

# Init proyecto
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

**Ventajas**:
- Integración perfecta con Firestore
- Misma región para latency bajo
- Custom certificates

**Desventajas**:
- Menos CDN locations
- Puede ser más caro

## 📞 Troubleshooting

| Problema | Solución |
|---|---|
| Build falla | Ver build logs en Cloudflare |
| App blanca/no carga | Check DevTools console (F12) |
| Firebase no conecta | Verificar env vars en Cloudflare |
| Dominio no apunta | Esperar DNS propagation (10 min) |
| CORS errors | No debería ocurrir con Cloudflare |
| SSL certificado inválido | Cloudflare maneja automáticamente |

## 🎯 Quick Commands

```bash
# Local development
npm run dev

# Local preview (simula producción)
npm run preview

# Build para Cloudflare
npm run build

# Deploy a Firebase (alternativa)
firebase deploy --only hosting

# Check Cloudflare logs en vivo
wrangler pages deployment tail
```

## 📚 Recursos

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Custom Domains](https://developers.cloudflare.com/pages/platform/custom-domains/)

---

**Listo para desplegar? Empieza en "Paso 1: Preparar Repositorio Git"**

¿Necesitas help? Abre un issue en GitHub o consulta la documentación de Cloudflare.
