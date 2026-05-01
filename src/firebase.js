import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// IMPORTANTE: Reemplaza estos valores con tus credenciales de la Consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD46f7xoaS9Nf8pZ3_tOxo96IJTiaWo5y4",
  authDomain: "game-awards-d7881.firebaseapp.com",
  projectId: "game-awards-d7881",
  storageBucket: "game-awards-d7881.firebasestorage.app",
  messagingSenderId: "321669895248",
  appId: "1:321669895248:web:2bdce94f9d0677b22cad55",
  measurementId: "G-5ZZGWP5CGQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Lazy load Analytics para evitar errores de inicialización
let analyticsInstance = null;
let analyticsLoaded = false;

export const getAnalyticsInstance = async () => {
  if (analyticsLoaded) return analyticsInstance;
  
  try {
    const { getAnalytics } = await import("firebase/analytics");
    analyticsInstance = getAnalytics(app);
    analyticsLoaded = true;
  } catch (error) {
    console.warn('Analytics not available:', error);
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
    console.warn('Error tracking event:', error);
  }
};
