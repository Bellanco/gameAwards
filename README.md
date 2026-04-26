# 🎮 TGA Ballot - The Game Awards Interactive Voting

Aplicación React + Vite para votar en The Game Awards con autenticación Google y Firebase.

## ✨ Características

- 🔐 Autenticación Google (un voto por usuario)
- 🎯 Votación por categoría (UI paso a paso)
- 📅 Deadline automático (1 dic)
- 💾 Firebase Firestore + localStorage
- 📱 Responsive (móvil → desktop)
- 🌙 Dark theme con Tailwind CSS
- 🌍 i18n (ES/EN)

## 🛠 Setup Rápido

### 1. Instalación
```bash
npm install
```

### 2. Configurar Firebase

Ve a [Firebase Console](https://console.firebase.google.com/):
- Copia credenciales a `src/firebase.js`
- Habilita Google Auth
- Configura Firestore con estas reglas:

```firestore
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

### 3. Desarrollo
```bash
npm run dev
```
Abre http://localhost:5173

### 4. Build
```bash
npm run build
```

## 🚀 Deploy en CloudFlare Pages

1. Push a GitHub
2. En https://dash.cloudflare.com → Pages
3. Conecta tu repo
4. Build: `npm run build` | Output: `dist`
5. ¡Listo!

## 📂 Estructura

```
src/
├── App.jsx                 # Orquestador principal
├── components/             # Pantallas (Login, Vote, Review, etc)
├── data/
│   ├── categories.js       # Categorías y nominados (actualizar anualmente)
│   ├── gameData.js         # Datos de juegos
│   ├── gameMetadata.js     # Metadata de imágenes
│   └── literals.js         # Textos i18n (ES/EN)
├── services/
│   └── gameImageService.js # Servicio de imágenes
└── firebase.js            # Config Firebase
```

## 🔄 Flujo de Usuario

1. **Login** → Google Auth
2. **Votación** → Categoría por categoría
3. **Revisión** → Ver selecciones
4. **Éxito** → Guardado en Firebase
5. **Admin** → Ver resultados

## ⚙️ Variables de Entorno

Copia `.env.example` a `.env.local`:

```bash
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🔒 Seguridad

- Firebase Auth UID = documento ID (1 voto/usuario)
- Firestore rules: solo el usuario lee/escribe su voto
- localStorage: sin datos sensibles
- DEMO_MODE: desarrollo offline

## 📦 Stack

- React 18
- Vite 5
- Firebase 10
- Tailwind CSS 3
- JavaScript ES2020+

## 👤 Autor

Creado para TGA Ballot 2024+

## 📄 Licencia

MIT


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
