/**
 * MODO DEMO - Simula autenticación sin Firebase real
 * Útil para testing, development y demos
 * 
 * Para activar:
 * 1. Descomenta: const DEMO_MODE = true; (línea abajo)
 * 2. Guarda el archivo
 * 3. Recarga página (http://localhost:5173)
 * 
 * Para desactivar:
 * 1. Comenta: // const DEMO_MODE = true;
 * 2. Guarda el archivo
 * 3. Recarga página - vuelve a requerir Firebase real
 */

// ⭐ DESCOMENTAR PARA ACTIVAR MODO DEMO ⭐
const DEMO_MODE = true; // ✅ DEMO MODE ACTIVADO
// const DEMO_MODE = false; // ← Cambiar a `true` para activar

/**
 * Usuario simulado para modo demo
 */
const DEMO_USER = {
  uid: 'demo-user-12345',
  email: 'demo@example.com',
  displayName: 'Votante Demo'
};

/**
 * Simula signInWithPopup cuando está en DEMO_MODE
 */
export const simulateGoogleAuth = async () => {
  return new Promise((resolve) => {
    // Simula delay de 1 segundo como si fuera real
    setTimeout(() => {
      resolve({ user: DEMO_USER });
    }, 1000);
  });
};

/**
 * Simula setDoc (guardar voto) en DEMO_MODE
 */
export const simulateSaveVote = async (ballotData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('✅ [DEMO] Voto guardado:', ballotData);
      // Guardar en localStorage como backup
      localStorage.setItem('demoVote', JSON.stringify(ballotData));
      resolve();
    }, 1500);
  });
};

/**
 * Verifica si estamos en DEMO_MODE
 */
export const isDemoMode = () => DEMO_MODE;

export default {
  DEMO_MODE,
  DEMO_USER,
  simulateGoogleAuth,
  simulateSaveVote,
  isDemoMode
};
