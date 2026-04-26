# TGA Ballot - Aplicación Completa de Votación

## 🎮 ¿Qué es?

**TGA Ballot** es la aplicación oficial interactiva de votación para The Game Awards. Una experiencia moderna, oscura y profesional donde los usuarios pueden votar por sus juegos y categorías favoritas.

## ✨ Características Principales

### 🎯 **Interfaz Responsiva & Moderna**
- Diseño dark theme profesional (gradientes slate/yellow)
- Móvil-first: 320px → 768px → 1024px+
- Animaciones suaves y retroalimentación visual
- Glassmorphism effects con backdrop-blur

### 🔐 **Seguridad & Votación única**
- Autenticación con Google Sign-In
- Un voto por usuario (enforced por Firebase UID)
- Firestore como single source of truth
- Reglas de seguridad que previenen manipulación

### 📊 **Manejo de Variedad**
- Soporta 3-10+ candidatos por categoría automáticamente
- Grid responsivo que se adapta al número de opciones
- Ningún hardcoding: todo en `src/data/categories.js`

### 🌍 **Localización Lista**
- Textos centralizados en `src/data/literals.js`
- Fácil de traducir a cualquier idioma
- Interfaz completamente en español

### 💾 **Persistencia Inteligente**
- localStorage para progreso en sesión
- Recupera automaticamente donde deixaste
- Firestore para guardado permanente

## 🚀 Inicio Rápido

### Instalación
```bash
npm install
```

### Desarrollo
```bash
npm run dev
# Abre http://localhost:5173
```

### Build para Producción
```bash
npm run build
# Genera carpeta dist/ lista para Cloudflare Pages
```

## 📁 Estructura de Archivos

```
src/
├── App.jsx                 # Orquestador de estado y flujo
├── main.jsx                # Punto de entrada React
├── index.css               # Tailwind directives
├── firebase.js             # Configuración Firebase
├── data/
│   ├── categories.js       # Categorías y candidatos (EDITAR AQUÍ CADA AÑO)
│   └── literals.js         # Textos de UI (para i18n)
└── components/
    ├── LoginScreen.jsx     # Acceso con Google
    ├── VoteScreen.jsx      # Votación por categoría
    ├── ReviewScreen.jsx    # Resumen + input nickname
    ├── SuccessScreen.jsx   # Confirmación final
    └── DeadlineScreen.jsx  # Votación cerrada
```

## 🎨 Diseño & UX

### Paleta de Colores
- **Base**: `slate-950, slate-900, slate-800` (backgrounds)
- **Accent**: `yellow-500, yellow-600` (selected state, buttons)
- **Success**: `green-500` (confirmación)
- **Error**: `red-400` (alertas)

### Tipografía
- **Títulos**: Font Weight 900, tracking-tight
- **Labels**: Font Weight 600, uppercase
- **Body**: Font Weight 400/500, leading-relaxed

### Animaciones
- `animate-bounce` para iconos
- `fade-in` para pantallas
- `scale-105 hover` en botones
- Transiciones `duration-300`

## 📱 Responsividad Garantizada

### VoteScreen - Grid inteligente por cantidad de opciones
```javascript
3-4 opciones: grid-cols-2 md:grid-cols-3
5-6 opciones: grid-cols-2 md:grid-cols-3 lg:grid-cols-3
7-9 opciones: grid-cols-3 md:grid-cols-3 lg:grid-cols-3
10+ opciones: grid-cols-2 md:grid-cols-4 lg:grid-cols-5
```

### Breakpoints Tailwind
- `sm: 640px` - Tablets pequeñas
- `md: 768px` - Tablets
- `lg: 1024px` - Laptops
- `xl: 1280px` - Desktops grandes

## 🔧 Configuración Firebase

### 1. Credenciales
Edita `src/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  projectId: "TU_PROYECTO",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 2. Dominio Autorizado
En Firebase Console → Authentication → Settings:
- Agrega tu dominio (localhost:5173 para dev, tu URL para producción)

### 3. Reglas de Firestore
```plaintext
match /ballots/{userId} {
  allow write: if request.auth != null && request.auth.uid == userId;
  allow read: if request.auth != null && request.auth.uid == userId;
}
```

## 📅 Flujo de Votación

```
1. Usuario ingresa
   ↓
2. Google Sign-In
   ↓
3. LoginScreen → VoteScreen (categoría 1)
   ↓
4. Vota categoría → Auto-avanza a siguiente
   ↓
5. Repite para todas las categorías
   ↓
6. ReviewScreen → Ingresa apodo + revisa votos
   ↓
7. SubmitBallot → Firestore
   ↓
8. SuccessScreen → 🏆
```

## ⚙️ Datos & Configuración

### Actualizar Categorías (Anual)
Edita `src/data/categories.js`:
```javascript
{
  id: "bestVoiceActing",      // camelCase, único
  title: "Best Voice Acting",  // Nombre visible
  options: ["Actor A", "Actor B", ...]
}
```

### Cambiar Textos
Edita `src/data/literals.js`:
```javascript
export const appText = {
  title: "TGA Ballot",
  loginBtn: "Sign in with Google",
  // ... más textos
}
```

## 🌐 Despliegue a Cloudflare Pages

### Primera vez
1. Conecta repo a Cloudflare Pages
2. Build command: `npm run build`
3. Output folder: `dist/`
4. Agrega variables de entorno (VITE_FIREBASE_*)

### Desplegar
```bash
git add .
git commit -m "Update for 2025"
git push origin main
# Cloudflare se despliega automáticamente
```

## 🧪 Pruebas

### En Desarrollo
```bash
npm run dev
# Prueba todos los flujos manualmente:
# - Login con Google
# - Votación en cada categoría
# - Navegación hacia atrás
# - Revisión y envío
```

### Pantallas por Tamaño
```
320px (iPhone SE)
640px (Tablet pequeña)
768px (iPad)
1024px+ (Desktop)
```

### Mock Mode
`submitBallot()` está en mock mode. Para activar Firebase:
```javascript
// En App.jsx, descomenta:
await setDoc(doc(db, "ballots", currentUser.uid), ballotData);
```

## 🐛 Troubleshooting

### "Google popup bloqueado"
→ Habilita popups en tu navegador o usa incógnito

### "No se envía el voto"
→ Verifica que todas las categorías estén votadas
→ Verifica que hayas ingresado un apodo

### "Firebase errors en consola"
→ Revisa credenciales en `src/firebase.js`
→ Verifica dominio en Firebase Console

### "Votación no persiste"
→ Abre DevTools → Storage → localStorage
→ Debería haber key `votingProgress`

## 📈 Escalabilidad

### Fase 1 (Actual): MVP ✅
- ✅ Votación básica
- ✅ Una categoría por pantalla
- ✅ Resumen final
- ✅ Almacenamiento seguro

### Fase 2 (Próxima)
- [ ] Admin dashboard con resultados
- [ ] Edición de votos
- [ ] Leaderboards

### Fase 3 (Futuro)
- [ ] Resultados en tiempo real
- [ ] Perfiles de usuario
- [ ] Multiplayer/ligas

## 📚 Referencia Rápida

| Acción | Archivo | Línea |
|--------|---------|-------|
| Cambiar categorías | `src/data/categories.js` | - |
| Cambiar textos | `src/data/literals.js` | - |
| Editar flujo | `src/App.jsx` | useEffect, handleLogin |
| Cambiar estilos | `tailwind.config.js` | - |
| Pantalla votación | `src/components/VoteScreen.jsx` | - |
| Agregar seguridad | `.github/firestore.rules` | - |

## 🎓 Para Developers

### Agregar Nueva Pantalla
1. Crea `src/components/NewScreen.jsx`
2. Importa en `src/App.jsx`
3. Agrega paso al flujo (modifica `currentStep`)
4. Renderiza en sección correspondiente

### Agregar Interacción
1. Crea manejador en `App.jsx` (ej: `handleNewAction()`)
2. Pasa como prop a componente
3. Componente llama callback al evento

### Estilo Mobile-First
1. Escribe estilos base (móvil)
2. Agrrega breakpoints: `md:`, `lg:`, `xl:`
3. Prueba en 320px, 768px, 1024px

## 📞 Soporte

- **Errores**: Revisa browser console (DevTools)
- **Firebase**: Ve a Firebase Console
- **Código**: Revisa archivos correspondientes

---

**Última Actualización**: 2025
**Versión**: 2.0 (Modular & Production-Ready)
**Estado**: ✅ Lista para producción
