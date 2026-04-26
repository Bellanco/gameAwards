# Cloudflare Pages Configuration

Este es el archivo de configuración para desplegar en Cloudflare Pages.

## Setup en Cloudflare Dashboard

1. **Ir a Cloudflare Pages**
   - URL: https://dash.cloudflare.com
   - Selecciona tu account

2. **Crear proyecto**
   - Click en "Create a project"
   - Selecciona "Connect to Git"
   - Autoriza tu repositorio (GitHub, GitLab, etc)

3. **Configurar Build**
   - **Project name**: `tga-ballot`
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory (advanced)**: `/` (déjalo vacío)

4. **Variables de Entorno**
   - Ve a Settings > Environment variables
   - Añade:
     ```
     VITE_FIREBASE_API_KEY = tu_api_key
     VITE_FIREBASE_AUTH_DOMAIN = tu_proyecto.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID = tu_proyecto
     VITE_FIREBASE_STORAGE_BUCKET = tu_proyecto.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID = tu_id
     VITE_FIREBASE_APP_ID = tu_app_id
     ```

5. **Deploy**
   - Cloudflare automáticamente desplegará en cada push a main
   - Verás el dominio: `https://tga-ballot.pages.dev`

## Dominio Personalizado

1. Go to Settings > Domains
2. Add custom domain
3. Apunta tu DNS a Cloudflare (CNAME)

## Variables de Entorno Local

Para desarrollo, crea `.env.local`:

```
VITE_FIREBASE_API_KEY=abc123
VITE_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-project
VITE_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456
VITE_FIREBASE_APP_ID=1:123456:web:abc123
```

## Debugging Deployments

- **Build logs**: https://dash.cloudflare.com → Pages → Select project → Deployments
- **Real-time logs**: `wrangler pages deployment tail`
- **Local preview**: `npm run preview`

## Rollback

Si algo sale mal:
1. Cloudflare → Pages → Select project → Deployments
2. Selecciona un deployment anterior
3. Click en "Rollback"

## Firebase Firestore con Cloudflare

- Las reglas Firestore funcionan igual
- Los CORS se manejan automáticamente
- No necesitas configurar nada especial

## Performance Tips

- Vite optimiza automáticamente assets
- Cloudflare cachea en su CDN global
- Los bundles se comprimen (gzip)

---

Para más info: https://developers.cloudflare.com/pages/
