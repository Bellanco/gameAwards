/**
 * Hook custom: useVotingConfig
 * Lee (en tiempo real) el estado de la votación desde Firestore: `config/voting`.
 *
 * Documento esperado (`config/voting`):
 *   { isOpen: boolean, season: number, closesAt: string|null, updatedAt: string }
 *
 * Lectura pública (ver firestore.rules); la escritura es solo de admin.
 * Si el documento no existe todavía, se asume votación ABIERTA en la temporada
 * del año en curso, para no bloquear la app antes de que el admin lo configure.
 *
 * @typedef {Object} VotingConfig
 * @property {boolean} isOpen - Si la votación está abierta
 * @property {number} season - Temporada/año activo
 * @property {string|null} closesAt - Fecha informativa de cierre (ISO) o null
 * @property {boolean} isLoading - Estado de carga
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from '../services/errorService';

export const useVotingConfig = () => {
  const [config, setConfig] = useState({
    isOpen: true,
    season: new Date().getFullYear(),
    closesAt: null,
    isLoading: true,
  });

  useEffect(() => {
    const ref = doc(db, 'config', 'voting');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setConfig({
            isOpen: data.isOpen !== false, // por defecto abierto si el campo falta
            season: data.season || new Date().getFullYear(),
            closesAt: data.closesAt || null,
            isLoading: false,
          });
        } else {
          // Sin configuración aún: abierto por defecto
          setConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
      (err) => {
        logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'useVotingConfig' });
        setConfig((prev) => ({ ...prev, isLoading: false }));
      }
    );

    return () => unsubscribe();
  }, []);

  return config;
};
