# TGA Ballot 2024 - The Game Awards Voting App

Una aplicación web interactiva para votar y hacer apuestas en The Game Awards 2024.

## 🚀 Características

- ✅ Autenticación con Google (garantiza usuario único)
- ✅ Votación paso a paso (una categoría a la vez)
- ✅ Deadline automático (1 de diciembre)
- ✅ Almacenamiento en Firebase Firestore
- ✅ Voto único por usuario (imposible votar dos veces)
- ✅ Guardado de progreso local (localStorage)
- ✅ Responsive design (móvil, tablet, desktop)
- ✅ Interfaz oscura y moderna

## 📋 Requisitos Previos

- Node.js v16+
- npm o yarn
- Cuenta de Firebase activa

## ⚙️ Instalación

### 1. Clonar/Descargar el Proyecto
```bash
cd "Game Awards"
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Firebase

Ve a [Firebase Console](https://console.firebase.google.com/):

1. Crea un nuevo proyecto o usa uno existente
2. Habilita Firestore Database
3. Habilita Google Authentication
4. En "Configuración del Proyecto" > "SDK", copia tus credenciales
5. Abre `src/firebase.js` y reemplaza los placeholders:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_ID",
  appId: "TU_APP_ID"
};
```

### 4. Configurar Reglas de Firestore

En Firebase Console, ve a **Firestore Database** > **Reglas** y pega:

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

Luego haz clic en "Publicar".

### 5. Ejecutar en Desarrollo
```bash
npm run dev
```

La app se abrirá en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
src/
├── App.jsx                 # Componente principal (lógica de flujo)
├── firebase.js             # Configuración de Firebase
├── index.css               # Estilos de Tailwind
├── main.jsx                # Punto de entrada
├── data/
│   ├── categories.js       # Categorías y nominados (EDITAR AQUÍ CADA AÑO)
│   └── literals.js         # Textos de la UI (EDITAR AQUÍ PARA TRADUCIR)
└── components/             # (Para futuros componentes reutilizables)

index.html                  # HTML principal
package.json                # Dependencias
vite.config.js              # Config de Vite
tailwind.config.js          # Config de Tailwind
```

## 🎯 Uso

### Para Usuarios
1. Haz clic en "Sign in with Google"
2. Vota categoría por categoría
3. Usa los botones "Previous" / "Next" para navegar
4. Revisa tu selección antes de enviar
5. ¡Listo! Tu voto está guardado

### Para Administradores

#### Actualizar Categorías (Cada Año)
Edita `src/data/categories.js`:

```javascript
export const categories = [
  {
    id: "gameOfTheYear",
    title: "Game of the Year",
    options: ["Juego A", "Juego B", "Juego C", ...]
  },
  // ... más categorías
];
```

#### Cambiar Textos de la UI
Edita `src/data/literals.js` para cambiar el idioma o tono.

#### Ver Resultados en Firebase
Ve a Firebase Console > Firestore Database > Collection `ballots` para ver todos los votos en tiempo real.

#### Editar un Voto (Si un Usuario Lo Solicita)
En Firebase Console, abre la colección `ballots`, busca el documento con el email del usuario y edítalo directamente.

## 🔒 Seguridad

- **Un voto por usuario**: Usa el UID de Google como ID único del documento
- **Deadline**: Votaciones cerradas automáticamente el 1 de diciembre
- **localStorage**: Solo para mantener progreso local, no como fuente de verdad
- **Reglas de Firestore**: Solo usuarios autenticados pueden escribir sus propios datos

## 🛠 Build para Producción

```bash
npm run build
```

Los archivos estáticos se guardarán en `dist/`. Puedes desplegar en Vercel, Netlify, Firebase Hosting, etc.

## 📝 Personalización

### Cambiar Colores
Edita `tailwind.config.js` en la sección `theme.extend`.

### Agregar Componentes
Crea archivos en `src/components/` e impórtalos en `App.jsx`.

### Agregar Validaciones
Modifica la función `submitBallot()` en `App.jsx`.

## 🐛 Troubleshooting

**No me deja iniciar sesión con Google:**
- Verifica que Google Auth esté habilitado en Firebase Console
- Revisa que las credenciales en `src/firebase.js` sean correctas
- Comprueba que el dominio actual esté autorizado en Firebase (Settings > Authorized Domains)

**Mi voto no se guarda:**
- Abre DevTools (F12) > Console para ver errores
- Verifica que Firestore está activo en Firebase
- Comprueba las Reglas de Firestore (debe permitir write)

**Las categorías no aparecen:**
- Verifica que `src/data/categories.js` tiene la estructura correcta
- Comprueba que las claves de categoría están bien escritas en camelCase

## 📞 Soporte

Para reportar bugs o sugerencias, abre un issue en este repo.

---

**Última actualización:** 2024
**Tecnología:** React 18 + Vite + Tailwind CSS + Firebase
