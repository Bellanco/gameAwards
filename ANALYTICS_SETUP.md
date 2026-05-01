# Analytics y Error Tracking - TGA Ballot

## 📊 Descripción General

Se han implementado dos servicios para monitoreo de la aplicación:

1. **Google Firebase Analytics** - Rastrea eventos de usuario y flujo de votación
2. **Error Service** - Captura y registra errores de la aplicación

---

## 🎯 Analytics Implementado

### Eventos Rastreados

#### Autenticación
- `login` - Usuario inicia sesión con Google
- `logout` - Usuario cierra sesión

#### Votación
- `vote_selected` - Usuario selecciona una opción en una categoría
- `vote_changed` - Usuario cambia su voto
- `ballot_submitted` - Usuario envía la papeleta
- `incomplete_ballot_attempt` - Usuario intenta enviar papeleta incompleta
- `post_deadline_vote_attempt` - Intento de votar después del plazo

#### Navegación
- `category_viewed` - Usuario ve una categoría
- `review_started` - Usuario inicia la revisión de votos
- `edit_votes_clicked` - Usuario hace click en editar votos
- `page_viewed` - Página visitada (custom events)

#### Administración
- `admin_access_attempted` - Intento de acceso al panel admin
- `results_downloaded` - Descarga de resultados (JSON/CSV)

#### Sistema
- `language_changed` - Usuario cambia idioma
- `app_error` - Error capturado
- `performance_metric` - Métricas de performance

---

## 🚀 Cómo Usar Analytics

### En Components

```javascript
import { trackVoteSelected, trackBallotSubmitted } from '../services/analyticsService';

// Trackear selección de voto
const handleSelectOption = (option) => {
  trackVoteSelected('gameOfTheYear', 'Game of the Year', option);
  setSelectedOption(option);
};

// Trackear envío de papeleta
const handleSubmitBallot = () => {
  trackBallotSubmitted(ballots.length, nickname);
  // ... resto del código
};
```

### En LoginScreen

```javascript
import { trackLogin, trackLogout, trackLanguageChanged } from '../services/analyticsService';

const handleLogin = async () => {
  await signInWithPopup(auth, googleProvider);
  trackLogin(user.email);
};

const handleLogout = async () => {
  trackLogout(user.email);
  await signOut(auth);
};

const handleToggleLanguage = () => {
  trackLanguageChanged(newLanguage);
  setLanguage(newLanguage);
};
```

### En AdminPanel

```javascript
import { trackAdminAccessAttempted, trackResultsDownloaded } from '../services/analyticsService';

useEffect(() => {
  trackAdminAccessAttempted(user.email, isAdmin);
}, [isAdmin, user]);

const downloadJSON = () => {
  trackResultsDownloaded('json');
  // ... descargar JSON
};

const downloadCSV = () => {
  trackResultsDownloaded('csv');
  // ... descargar CSV
};
```

---

## 🛡️ Error Handling Implementado

### Servicio de Errores

El servicio de errores (`errorService.js`) proporciona:

1. **Registro de errores automático**
   ```javascript
   import { logError, ERROR_TYPES } from '../services/errorService';
   
   try {
     // código
   } catch (error) {
     logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
       operation: 'loadCategories',
       timestamp: new Date()
     });
   }
   ```

2. **Global Error Handler** - Captura errores no manejados
   ```javascript
   // En App.jsx, en useEffect
   import { setupGlobalErrorHandler } from '../services/errorService';
   
   useEffect(() => {
     setupGlobalErrorHandler();
   }, []);
   ```

3. **Error Log Persistente**
   - Almacena últimos 50 errores en localStorage
   - Accesible para debugging
   - Se puede exportar como JSON

### Tipos de Error

```javascript
ERROR_TYPES = {
  AUTH_ERROR: 'AUTH_ERROR',           // Errores de autenticación
  FIRESTORE_ERROR: 'FIRESTORE_ERROR', // Errores de base datos
  VALIDATION_ERROR: 'VALIDATION_ERROR', // Errores de validación
  NETWORK_ERROR: 'NETWORK_ERROR',     // Errores de red
  UI_ERROR: 'UI_ERROR',               // Errores de UI/render
  COMPONENT_ERROR: 'COMPONENT_ERROR', // Errores en componentes
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'      // Errores desconocidos
}
```

### Acceso al Error Log

```javascript
import { getErrorLog, clearErrorLog, downloadErrorLog } from '../services/errorService';

// Ver errores
const errors = getErrorLog(); // Array de errores

// Limpiar log
clearErrorLog();

// Descargar como archivo
downloadErrorLog();
```

---

## 📍 Próximos Pasos - Integración Completa

### 1. Actualizar App.jsx

```javascript
import { setupGlobalErrorHandler } from './services/errorService';
import { trackPageView } from './services/analyticsService';

export default function App() {
  useEffect(() => {
    // Setup global error handler
    setupGlobalErrorHandler();
    
    // Track inicial page view
    trackPageView('app_initialized');
  }, []);
  
  // ... resto
}
```

### 2. Actualizar LoginScreen

Importar y usar `trackLogin`, `trackLogout`, `trackLanguageChanged`

### 3. Actualizar VoteScreen

Importar y usar `trackCategoryViewed`, `trackVoteSelected`, `trackVoteChanged`

### 4. Actualizar ReviewScreen

Importar y usar `trackReviewStarted`, `trackIncompleteBallotAttempt`, `trackBallotSubmitted`

### 5. Actualizar AdminPanel

Importar y usar `trackAdminAccessAttempted`, `trackResultsDownloaded`

### 6. Actualizar DeadlineScreen

Importar y usar `trackDeadlineReached`, `trackPostDeadlineVoteAttempt`

---

## 📊 Visualizar Analytics en Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar proyecto "game-awards-d7881"
3. Ir a Analytics → Eventos en tiempo real
4. Ver los eventos conforme los usuarios interactúan

---

## 🔍 Debug - Ver Error Log

En la consola del navegador:
```javascript
// Ver todos los errores
JSON.parse(localStorage.getItem('appErrorLog'))

// Descargar log
import { downloadErrorLog } from './src/services/errorService';
downloadErrorLog();
```

---

## ⚠️ Consideraciones

- ✅ Analytics funciona automáticamente sin requerir configuración adicional
- ✅ Error log se persiste localmente en localStorage
- ✅ Todos los eventos se trackean automáticamente con timestamps
- ⚠️ Para Crashlytics completo, se requeriría `@react-native-firebase/crashlytics` (futuro)
- ⚠️ localStorage tiene límite de ~5MB; después de 50 errores se eliminan los más antiguos

---

## 📝 Notas

- Los servicios están completamente separados del código de UI
- Se pueden importar en cualquier componente sin dependencias circulares
- Los eventos se trackean de forma asincrónica sin bloquear la UI
- Errores no capturados se registran automáticamente gracias al Global Error Handler
