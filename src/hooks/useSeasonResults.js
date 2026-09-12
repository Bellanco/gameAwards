/**
 * Hook custom: useSeasonResults
 * Carga el histórico de resultados por temporada desde `results/{año}`.
 * Cada documento lo escribe seasonService.archiveAndResetSeason al cerrar una edición:
 *   { season, winners:{catId:optionId}, categoriesSnapshot:[...], leaderboard:[...], totalBallots }
 *
 * Lista TODA la colección, incluida la edición en curso, así que es una lectura
 * de admin: desde que `results` está protegido por fecha (ver firestore.rules),
 * un no-admin haría fallar la consulta entera al toparse con el documento de la
 * edición todavía sin publicar.
 *
 * @param {boolean} [enabled=true] - Si false, no se pide nada a Firestore.
 * @returns {{results: Array, isLoading: boolean, error: string|null, refetch: Function}}
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from '../services/errorService';

export const useSeasonResults = (enabled = true) => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setResults([]);
      setIsLoading(false);
      return;
    }
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
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { results, isLoading, error, refetch: load };
};

/**
 * Hook custom: useSeasonResult
 * Lee UN solo documento `results/{season}`: el que alimenta la pantalla pública
 * de resultados. Se lee bajo demanda (`enabled`) para no gastar una lectura por
 * visita mientras los resultados todavía no están publicados.
 *
 * @param {number|string} season - temporada a leer
 * @param {boolean} enabled - solo lee si es true
 * @returns {{result: Object|null, isLoading: boolean}}
 */
export const useSeasonResult = (season, enabled) => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || season == null) {
      setResult(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const snapshot = await getDoc(doc(db, 'results', String(season)));
        if (!cancelled) setResult(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      } catch (err) {
        logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'useSeasonResult', season });
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [season, enabled]);

  return { result, isLoading };
};
