import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import logger from "./services/loggerService";

/**
 * Firebase Configuration
 * Los valores se cargan desde variables de entorno (.env.local en desarrollo)
 * En producción, se configuran en CloudFlare Environment Variables
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validación en desarrollo
if (import.meta.env.MODE === 'development') {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    logger.error('⚠️ Firebase environment variables not configured. Create .env.local from .env.example');
  }
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Emuladores locales (solo para las pruebas e2e).
 *
 * Se activan con VITE_USE_EMULATORS=true, que solo pone `npm run test:e2e`.
 * En el build de producción la variable no existe, así que Vite resuelve la
 * condición a `false` y este bloque no llega al bundle.
 *
 * Sin esto, un e2e tendría que hablar con el Firebase real: cuentas de Google
 * de verdad, votos de verdad y datos que no se pueden sembrar ni borrar.
 */
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  logger.log('🧪 Firebase apuntando a los emuladores locales');
}

// Lazy load Analytics para evitar errores de inicialización
let analyticsInstance = null;
let analyticsLoaded = false;

export const getAnalyticsInstance = async () => {
  if (analyticsLoaded) return analyticsInstance;

  // Con los emuladores no hay proyecto real detrás: Analytics solo conseguiría
  // llenar la consola de errores de "API key not valid".
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    analyticsLoaded = true;
    return null;
  }
  
  try {
    const { getAnalytics } = await import("firebase/analytics");
    analyticsInstance = getAnalytics(app);
    analyticsLoaded = true;
  } catch (error) {
    logger.warn('Analytics not available:', error);
    analyticsLoaded = true;
  }
  
  return analyticsInstance;
};

/**
 * Track eventos en Google Analytics
 * @param {string} eventName - Nombre del evento
 * @param {object} parameters - Parámetros adicionales
 */
export const trackEvent = async (eventName, parameters = {}) => {
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      const { logEvent } = await import("firebase/analytics");
      logEvent(analytics, eventName, parameters);
    }
  } catch (error) {
    logger.warn('Error tracking event:', error);
  }
};
