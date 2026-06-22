/**
 * Hook custom: useSeasonResults
 * Carga el histórico de resultados por temporada desde `results/{año}`.
 * Cada documento lo escribe seasonService.archiveAndResetSeason al cerrar una edición:
 *   { season, winners:{catId:optionId}, categoriesSnapshot:[...], leaderboard:[...], totalBallots }
 *
 * Lectura pública (ver firestore.rules).
 *
 * @returns {{results: Array, isLoading: boolean, error: string|null, refetch: Function}}
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from '../services/errorService';

export const useSeasonResults = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const snapshot = await getDocs(collection(db, 'results'));
      const data = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.season || 0) - (a.season || 0)); // más reciente primero
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'useSeasonResults' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { results, isLoading, error, refetch: load };
};
