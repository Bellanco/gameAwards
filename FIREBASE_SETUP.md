# 🔐 Configurar Firebase para TGA Ballot

## El Problema
Actualmente, `src/firebase.js` tiene credenciales placeholder ("TU_API_KEY", etc.). Esto causa el error al intentar autenticarse con Google.

## ✅ Solución: 3 Pasos

### **Paso 1: Obtener Credenciales de Firebase Console**

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. **Crea un nuevo proyecto** (si no tienes uno):
   - Nombre: "TGA Ballot"
   - Ubicación: Tu país
   - Analytics: Desabilita (opcional)

3. En el dashboard del proyecto → **Configuración del proyecto** (⚙️)
4. Desplázate a "Tus apps" → Haz clic en `</>` (registrar aplicación web)
5. Nombre de la app: "TGA Ballot Web"
6. Marca "También configurar Firebase Hosting" (opcional)

7. Copia el objeto `firebaseConfig` que aparece:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",                    // ← COPIA ESTO
  authDomain: "tga-ballot.firebaseapp.com",
  projectId: "tga-ballot-xxxxx",
  storageBucket: "tga-ballot-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### **Paso 2: Actualizar src/firebase.js**

Abre `src/firebase.js` y reemplaza el `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",                    // ← TU VALOR
  authDomain: "tga-ballot.firebaseapp.com", // ← TU VALOR
  projectId: "tga-ballot-xxxxx",           // ← TU VALOR
  storageBucket: "tga-ballot-xxxxx.appspot.com", // ← TU VALOR
  messagingSenderId: "123456789",          // ← TU VALOR
  appId: "1:123456789:web:abcdef123456"    // ← TU VALOR
};
```

### **Paso 3: Autorizar Dominio (IMPORTANTE)**

1. En Firebase Console → **Authentication**
2. Tab: **Settings** (Configuración)
3. Desplázate a **Authorized domains** (Dominios autorizados)
4. Haz clic en **Add domain** (Agregar dominio)
5. Agrega: `localhost:5173`
6. ✅ Guarda

**Para producción después**, agregar:
- `tudominio.com`
- `www.tudominio.com`

### **Paso 4: Habilitar Google Sign-In**

1. Firebase Console → **Authentication**
2. Tab: **Sign-in method**
3. Proveedor: **Google**
4. ✅ Habilitar
5. Email support: Tu email o noreply@tga-ballot.firebaseapp.com
6. ✅ Guardar

---

## 🧪 Prueba

1. Ve a http://localhost:5173
2. Haz clic en "🔐 Sign in with Google"
3. Elige tu cuenta de Google
4. ✅ Deberías ver: Pantalla de votación

---

## 🐛 Si Sigue Fallando

Abre la **Consola del Navegador** (F12 → Console) y busca:

### Error 1: "invalid-api-key"
→ La API Key es incorrecta o está vencida  
→ **Solución**: Copia nuevamente desde Firebase Console

### Error 2: "unauthorized-domain"  
→ localhost:5173 no está en "Authorized domains"  
→ **Solución**: Agrega localhost:5173 en Firebase Console

### Error 3: "network-request-failed"
→ Problema de conexión  
→ **Solución**: Verifica que tienes internet, reinicia navegador

### Error 4: "operation-not-supported-in-this-environment"
→ Popup auth no funciona en http (solo en https)  
→ **Solución**: Usa https o intenta en navegador incógnito

---

## 📝 Checklist Final

- [ ] Proyecto Firebase creado
- [ ] firebaseConfig copiado en src/firebase.js
- [ ] Dominio localhost:5173 autorizado
- [ ] Google Sign-In habilitado
- [ ] npm run dev ejecutando
- [ ] Abriste http://localhost:5173
- [ ] Hiciste clic en "Sign in with Google"
- [ ] Elige tu cuenta
- [ ] ✅ Ves la pantalla de votación

---

## 🚀 Para Producción (Después)

Cuando despliegues a Cloudflare Pages:

1. Actualiza `src/firebase.js` con el mismo firebaseConfig
2. En Firebase Console → Authorized domains → Agregar:
   - `tudominio.com`
   - `www.tudominio.com`
3. Deploy: `git push origin main`

---

## 💡 Alternativa: Demo Mode

Si no quieres configurar Firebase aún, puedo hacer un **modo demo** que simule login sin necesidad de Firebase. ¿Te interesa?

---

**¿Necesitas ayuda con algún paso?** 🙋
