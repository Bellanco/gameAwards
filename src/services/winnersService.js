/**
 * Servicio de ganadores.
 *
 * El ganador de una categoría se guarda en `categories/{id}.winner` como el
 * optionId (nunca el nombre: así es independiente del idioma).
 *
 * Todas las escrituras requieren un usuario admin (ver firestore.rules).
 */

import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from './errorService';

/** Límite de operaciones por lote en Firestore. */
const BATCH_LIMIT = 500;

/**
 * Guarda los ganadores de TODAS las categorías en un único lote atómico.
 *
 * Antes esto era un `await updateDoc(...)` por categoría dentro de un bucle: con
 * 25 categorías, 25 viajes secuenciales al servidor (varios segundos) y, si
 * fallaba a mitad, quedaban ganadores a medias sin forma de deshacerlo. Con un
 * lote, o se guardan todos o no se guarda ninguno.
 *
 * Las categorías sin nominados se omiten: no pueden tener ganador.
 *
 * @param {Array} categories - Categorías sobre las que escribir
 * @param {Object.<string,string|null>} winners - Mapa categoryId -> optionId ganador
 * @returns {Promise<{saved: number, skipped: number}>}
 */
export async function saveWinners(categories, winners) {
  try {
    const writable = (categories || []).filter(
      (category) => category?.id && category.options?.length > 0
    );
    const skipped = (categories || []).length - writable.length;
    const winnerSelectedAt = new Date().toISOString();

    for (let i = 0; i < writable.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      for (const category of writable.slice(i, i + BATCH_LIMIT)) {
        batch.update(doc(db, 'categories', category.id), {
          winner: winners?.[category.id] || null,
          winnerSelectedAt,
        });
      }
      await batch.commit();
    }

    return { saved: writable.length, skipped };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'winnersService - saveWinners',
    });
    throw error;
  }
}
