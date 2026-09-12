/**
 * Hook custom: useFirestoreBallots
 * Maneja carga de votos (ballots) desde Firestore
 * Reutilizable en SurveyWinnersSelector, AdminPanel, etc.
 * 
 * @typedef {Object} Ballot
 * @property {string} userId - ID del usuario (Firebase UID)
 * @property {string} userEmail - Email del usuario
 * @property {string} userNickname - Apodo del usuario
 * @property {string} userDisplayName - Nombre para mostrar
 * @property {Object.<string, string>} selections - Votos por categoría
 * @property {string} submittedAt - ISO timestamp de envío
 * @property {boolean} isActive - Si está activo
 * 
 * @typedef {Object} UseFirestoreBallotsReturn
 * @property {Ballot[]} ballots - Array de votos
 * @property {boolean} isLoading - Estado de carga
 * @property {Error|null} error - Error si existe
 * @property {Function} refetch - Función para recargar datos
 *
 * @param {boolean} [enabled=true] - Si false, no se pide nada a Firestore.
 *   `ballots` NO es de lectura pública (solo dueño o admin), así que el panel
 *   debe esperar a tener confirmado el claim antes de pedir la colección: sin
 *   esto, cada visita a /admin de alguien sin permiso gastaba una petición que
 *   las reglas rechazaban.
 * @returns {UseFirestoreBallotsReturn} Estado y funciones
 */

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from '../services/errorService';

export const useFirestoreBallots = (enabled = true) => {
  const [ballots, setBallots] = useState([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const loadBallots = async () => {
    if (!enabled) {
      setBallots([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      const ballotsCollection = collection(db, 'ballots');
      const snapshot = await getDocs(ballotsCollection);
      
      const allBallots = snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));

      setBallots(allBallots);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { 
        context: 'useFirestoreBallots - loadBallots' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBallots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { ballots, isLoading, error, refetch: loadBallots };
};
