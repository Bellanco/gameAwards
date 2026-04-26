# 🚀 Guía de Inicio Rápido - TGA Ballot

⚡ **Forma Rápida (Windows)**: Haz doble clic en `dev.bat` ✅

👇 **Forma Manual**: Sigue los pasos abajo

---

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto descargará React, Firebase, Tailwind CSS y todas las herramientas necesarias. Espera a que termine (puede tardar 1-2 minutos).

## Paso 2: Obtener Credenciales de Firebase

### 2.1 Crea o Usa un Proyecto de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Create Project" o selecciona uno existente
3. Completa el setup (nombre del proyecto, acepta los términos)

### 2.2 Obtén las Credenciales

1. En la página del proyecto, haz clic en el icono ⚙️ (Settings)
2. Ve a "General"
3. Busca "Your apps" al fondo y haz clic en "</> Web"
4. Se abrirá una modal con tu configuración de Firebase
5. Copia el objeto `firebaseConfig` que aparece

```javascript
// Verás algo como esto (con tus valores reales):
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mi-proyecto.firebaseapp.com",
  projectId: "mi-proyecto",
  storageBucket: "mi-proyecto.appspot.com",
  messagingSenderId: "12345...",
  appId: "1:12345:web:abcde..."
};
```

## Paso 3: Configurar Firebase en el Proyecto

1. Abre el archivo `src/firebase.js` en el editor
2. Reemplaza los valores `TU_*` con tus credenciales reales
3. Guarda el archivo (Ctrl+S)

```javascript
// ANTES:
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  // ...
};

// DESPUÉS:
const firebaseConfig = {
  apiKey: "AIza...",  // Tu valor real
  authDomain: "mi-proyecto.firebaseapp.com",  // Tu valor real
  // ...
};
```

## Paso 4: Habilitar Google Authentication

Vuelve a Firebase Console:

1. Ve a **Authentication** en el menú izquierdo
2. Haz clic en la pestaña **Sign-in method**
3. Busca "Google" en la lista
4. Haz clic en el icono ✏️ (Edit)
5. Activa el switch (turn on)
6. En "Project support email", selecciona tu email
7. Haz clic en **Save**

## Paso 5: Crear Base de Datos Firestore

1. En Firebase Console, ve a **Firestore Database**
2. Haz clic en **Create Database**
3. Selecciona:
   - Location: Elige una cercana (ej: `europe-west1` para Europa)
   - Rules: **Start in test mode** (lo cambiaremos en el paso siguiente)
4. Haz clic en **Create**

## Paso 6: Configurar Reglas de Seguridad

1. En Firestore Database, ve a la pestaña **Rules**
2. Borra TODO lo que hay
3. Copia y pega esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ballots/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Haz clic en **Publish**

> ⚠️ **Importante**: Esto asegura que solo usuarios autenticados puedan escribir sus propios datos.

## Paso 7: Arranca la Aplicación

En la terminal, ejecuta:

```bash
npm run dev
```

Te verás algo como:

```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Haz clic en la URL o cópiala en tu navegador.

## 🎉 ¡Listo!

Deberías ver la aplicación con un botón "Sign in with Google". Intenta:

1. Haz clic en "Sign in with Google"
2. Selecciona tu cuenta de Google
3. Vota en las categorías
4. Al final, revisa y envía

Los votos se guardarán automáticamente en Firestore.

---

## 🪟 Usando Scripts Batch (Windows)

Si estás en Windows, puedes usar estos scripts para simplificar:

### `dev.bat` - Desarrollo Rápido
Doble clic en `dev.bat`:
- ✅ Verifica Node.js
- ✅ Instala dependencias (si es la primera vez)
- ✅ Abre el navegador automáticamente
- ✅ Inicia el servidor en http://localhost:5173

### `setup-dev.bat` - Setup Limpio + Dev
Si necesitas limpiar y empezar:
- ✅ Elimina node_modules anterior
- ✅ Instala todo de nuevo
- ✅ Inicia servidor

### `build-cloudflare.bat` - Build para Cloudflare
Para preparar para producción:
- ✅ Instala deps
- ✅ Compila con `npm run build`
- ✅ Verifica que `dist/` se creó
- ✅ Muestra próximos pasos

---

## ❓ Preguntas Frecuentes

### "Me sale error de CORS al iniciar sesión"

**Solución:**
1. Ve a Firebase Console > Settings > Authentication > Authorized domains
2. Añade `localhost:5173` si no está

### "No veo la aplicación, solo una pantalla blanca"

**Solución:**
1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Busca mensajes de error rojo
4. Si dice algo de "firebase config", verifica el Paso 3

### "¿Cómo edito las categorías?"

Edita el archivo `src/data/categories.js`. Cada categoría necesita:

```javascript
{
  id: "identificadorUnico",           // en camelCase
  title: "Nombre Visible al Usuario",
  options: ["Opción 1", "Opción 2", "Opción 3", ...]
}
```

### "¿Cómo cambio el idioma o los textos?"

Edita `src/data/literals.js`. Todos los textos están centralizados allí.

### "¿Cómo despliego en producción?"

1. Build: `npm run build`
2. Los archivos en la carpeta `dist/` están listos
3. Despliega en Vercel, Netlify, Firebase Hosting, etc.
4. Añade tu dominio a "Authorized domains" en Firebase

---

**¿Atascado?** Abre DevTools (F12) y verifica la consola por errores. Si algo falla, debería haber un mensaje descriptivo.

¡Disfruta de tu app! 🚀
