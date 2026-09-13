/**
 * Hook custom: useVotingConfig
 * Lee (en tiempo real) el estado de la votación desde Firestore: `config/voting`.
 *
 * Documento esperado (`config/voting`):
 *   { isOpen: boolean, season: number,
 *     opensAt: string|null,   opensAtMillis: number|null,
 *     closesAt: string|null,  closesAtMillis: number|null,
 *     resultsAt: string|null, resultsAtMillis: number|null,
 *     updatedAt: string }
 *
 * Cada fecha viaja en dos formatos: el ISO para mostrar y el epoch en ms para
 * comparar (es el que leen también las reglas de Firestore). El hook devuelve
 * los dos y deja la interpretación a `utils/votingSchedule.js`, que es puro y
 * comparte semántica con las reglas.
 *
 * Lectura pública (ver firestore.rules); la escritura es solo de admin.
 * Si el documento no existe todavía, se asume votación ABIERTA en la temporada
 * del año en curso y sin resultados publicados, para no bloquear la app antes de
 * que el admin lo configure.
 *
 * @typedef {Object} VotingConfig
 * @property {boolean} isOpen - Cierre forzado del admin (false = cerrada)
 * @property {number} season - Temporada/año activo
 * @property {string} seasonId - Identificador de la edición (clave de `results`)
 * @property {string} seasonName - Nombre visible de la edición
 * @property {string|null} opensAt - Instante de apertura (ISO) o null
 * @property {number|null} opensAtMillis - Instante de apertura (epoch) o null
 * @property {string|null} closesAt - Instante de cierre (ISO) o null
 * @property {number|null} closesAtMillis - Instante de cierre (epoch) o null
 * @property {string|null} resultsAt - Publicación de resultados (ISO) o null
 * @property {number|null} resultsAtMillis - Publicación de resultados (epoch) o null
 * @property {string} lastPublishedId - Id del último archivo publicado en `results`
 * @property {boolean} isLoading - Estado de carga
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from '../services/errorService';

/** Config por defecto mientras no hay documento: nada restringe, nada publicado. */
const DEFAULT_CONFIG = {
  isOpen: true,
  season: new Date().getFullYear(),
  // Identidad de la edición: el id es la clave de su archivo en `results` y el
  // nombre lo que se muestra. Vacíos = edición "de siempre", identificada por
  // su año (ver utils/seasonId.js).
  seasonId: '',
  seasonName: '',
  opensAt: null,
  opensAtMillis: null,
  closesAt: null,
  closesAtMillis: null,
  resultsAt: null,
  resultsAtMillis: null,
  // Id del último archivo publicado (`results/{id}`). Es lo que hace visible la
  // pantalla pública de resultados: lo escribe el archivado de la edición.
  lastPublishedId: '',
};

/**
 * Normaliza un par (ISO, epoch) del documento.
 * Si falta el epoch pero hay ISO (dato escrito a mano en la consola de Firebase),
 * se deriva aquí para que el cliente no ignore una fecha que sí existe.
 */
const readInstant = (data, field) => {
  const iso = data[`${field}At`] || null;
  const millis = data[`${field}AtMillis`];
  return {
    [`${field}At`]: iso,
    [`${field}AtMillis`]:
      typeof millis === 'number' ? millis : iso ? Date.parse(iso) : null,
  };
};

export const useVotingConfig = () => {
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, isLoading: true });

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
            seasonId: data.seasonId || '',
            seasonName: data.seasonName || '',
            lastPublishedId: data.lastPublishedId || '',
            ...readInstant(data, 'opens'),
            ...readInstant(data, 'closes'),
            ...readInstant(data, 'results'),
            isLoading: false,
          });
        } else {
          // Sin configuración aún: abierto por defecto
          setConfig({ ...DEFAULT_CONFIG, isLoading: false });
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
