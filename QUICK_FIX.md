# 🚀 Solución: Error de Google Sign-In

## El Problema ❌
El modal de Google se abre y se cierra inmediatamente → **Error: "Error al iniciar sesión. Intenta de nuevo."**

**Causa**: Las credenciales de Firebase en `src/firebase.js` son placeholders ("TU_API_KEY", etc.)

---

## 2 Soluciones

### **Opción A: DEMO MODE (Inmediato) ⚡**
Activa el modo demo para ver toda la aplicación sin Firebase:

**Pasos:**
1. Abre `src/demo.js`
2. Cambia línea 15:
   ```javascript
   const DEMO_MODE = false;  // ← Cambiar a
   const DEMO_MODE = true;   // ← Esto
   ```
3. Guarda (Ctrl+S)
4. Página se recarga automáticamente
5. Haz clic en "Sign in with Google"
6. ✅ Entra directo a votación (sin popup real)

**Qué ves:**
- Login instantáneo
- Toda la app funcional (votación, revisión, éxito)
- ✅ "DEMO MODE" en pantalla de éxito
- Perfecto para testing

---

### **Opción B: Firebase Real (Recomendado) 🔐**

**Pasos:**
1. Lee: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) (guía paso a paso)
2. Ve a [Firebase Console](https://console.firebase.google.com)
3. Crea proyecto o usa existente
4. Copia credenciales a `src/firebase.js`
5. Autoriza dominio: `localhost:5173` en Firebase Console
6. Guarda
7. ✅ Google Sign-In funciona real

**Ventajas:**
- Votos guardados en Firestore
- Producción-ready
- Un voto por usuario enforced
- Datos persistentes

---

## 🔍 Mejor Manejo de Errores

He mejorado los mensajes de error. Ahora verás:

| Error | Causa | Solución |
|-------|-------|----------|
| 🚫 "El popup fue bloqueado" | Navegador bloqueó popups | Habilita popups en configuración |
| ❌ "Cerraste la ventana" | Usuario cerró el popup | Intenta de nuevo |
| ⚠️ "Firebase no está configurado" | firebaseConfig inválido | Copia credenciales reales |
| 🔑 "API Key inválida" | Credenciales incorrectas | Verifica en Firebase Console |
| 🔗 "Dominio no autorizado" | localhost:5173 no está en lista | Agrégalo en Firebase Console |
| ⚙️ "Popup no soportado" | Intenta en http (no https) | Usa https o incógnito |

---

## 📊 Estado Actual

```
✅ App compila sin errores (54 módulos)
✅ Dev server corriendo (http://localhost:5173)
✅ Componentes modulares listos
✅ Manejo de errores mejorado
✅ DEMO MODE disponible
⏳ Firebase: esperando configuración
```

---

## ⚡ Recomendación

**Para ahora:**
1. Activa `DEMO_MODE = true` en `src/demo.js`
2. Testea flujo completo (votación → revisión → éxito)
3. Asegúrate de que todo se ve bien

**Mientras configuras Firebase:**
1. Ve a Firebase Console (5 minutos)
2. Crea proyecto
3. Sigue [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
4. Cambia `DEMO_MODE = false`
5. ✅ Login real funciona

---

## 🎯 Próximos Pasos

1. **Ahora**: Activa DEMO_MODE y testea
2. **Después**: Configura Firebase
3. **Producción**: Desplegar a Cloudflare Pages

---

**¿Preguntas?** Abre DevTools (F12) → Console para ver logs detallados 🔍
