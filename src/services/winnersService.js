/**
 * Servicio de ganadores.
 *
 * Los ganadores viven en UN documento, `admin/winners`, con la forma
 * `{ winners: { categoryId: optionId }, updatedAt }`. Solo lo lee y lo escribe
 * un administrador (`match /admin/**` en firestore.rules).
 *
 * POR QUÉ NO EN `categories`: antes el ganador era `categories/{id}.winner`,
 * pero esa colección tiene que ser de lectura pública para que se pueda votar,
 * y las reglas de Firestore protegen documentos enteros, no campos sueltos. El
 * resultado es que cualquiera —sin sesión siquiera— podía leer los ganadores en
 * cuanto el admin los marcaba, mucho antes de anunciarlos. El único canal
 * público de los ganadores es ahora el snapshot `results/{seasonId}`, que las
 * reglas no dejan leer hasta la fecha de publicación.
 *
 * Todas las escrituras requieren un usuario admin (ver firestore.rules).
 */

import { doc, getDoc, setDoc, deleteDoc, deleteField, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from './errorService';
import logger from './loggerService';

/** Límite de operaciones por lote en Firestore. */
const BATCH_LIMIT = 500;

/** Documento único donde viven los ganadores de la edición en curso. */
const winnersDoc = () => doc(db, 'admin', 'winners');

/**
 * Ganadores de la edición en curso: `{ categoryId: optionId }`.
 *
 * Si el documento aún no existe, reconstruye el mapa desde el campo `winner` de
 * las categorías que se le pasen. Es la ruta de MIGRACIÓN: una instalación que
 * venga del modelo anterior sigue viendo sus ganadores, y el primer guardado los
 * traslada al sitio nuevo (ver `saveWinners`).
 *
 * @param {Array} [categories] - categorías, para el respaldo legacy
 * @returns {Promise<Object.<string,string>>}
 */
export async function fetchWinners(categories = []) {
  try {
    const snapshot = await getDoc(winnersDoc());
    if (snapshot.exists()) {
      return snapshot.data()?.winners || {};
    }
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'winnersService - fetchWinners',
    });
    throw error;
  }

  const legacy = {};
  (categories || []).forEach((category) => {
    if (category?.id && category.winner) legacy[category.id] = category.winner;
  });
  if (Object.keys(legacy).length > 0) {
    logger.warn('Ganadores leídos del formato antiguo (categories.winner); se migrarán al guardar.');
  }
  return legacy;
}

/**
 * Guarda los ganadores de TODAS las categorías en una única escritura.
 *
 * Antes esto era un `updateDoc` por categoría: con 25 categorías, 25 viajes al
 * servidor y, si fallaba a mitad, ganadores a medias. Ahora es un solo
 * documento, así que o se guarda entero o no se guarda.
 *
 * Además ARRASTRA LA MIGRACIÓN: borra el campo `winner` de las categorías que
 * todavía lo tengan. Mientras ese campo siga en `categories` (pública), el
 * ganador sigue siendo consultable por cualquiera, que es justo el agujero que
 * este cambio cierra.
 *
 * @param {Array} categories - Categorías de la edición
 * @param {Object.<string,string|null>} winners - Mapa categoryId -> optionId ganador
 * @returns {Promise<{saved: number, skipped: number, migrated: number}>}
 */
export async function saveWinners(categories, winners) {
  try {
    const writable = (categories || []).filter(
      (category) => category?.id && category.options?.length > 0
    );
    const skipped = (categories || []).length - writable.length;

    // Solo las categorías con nominados pueden tener ganador; el resto ni
    // siquiera entra en el mapa.
    const clean = {};
    writable.forEach((category) => {
      const optionId = winners?.[category.id];
      if (optionId) clean[category.id] = optionId;
    });

    await setDoc(winnersDoc(), {
      winners: clean,
      updatedAt: new Date().toISOString(),
    });

    const migrated = await clearLegacyWinnerField(categories);

    return { saved: Object.keys(clean).length, skipped, migrated };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'winnersService - saveWinners',
    });
    throw error;
  }
}

/**
 * Borra el campo `winner` (y su `winnerSelectedAt`) de las categorías que lo
 * conserven del modelo anterior. Idempotente: si no queda ninguna, no escribe.
 *
 * @param {Array} categories
 * @returns {Promise<number>} categorías limpiadas
 */
export async function clearLegacyWinnerField(categories) {
  const stale = (categories || []).filter((category) => category?.id && category.winner);
  if (stale.length === 0) return 0;

  for (let i = 0; i < stale.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const category of stale.slice(i, i + BATCH_LIMIT)) {
      batch.update(doc(db, 'categories', category.id), {
        winner: deleteField(),
        winnerSelectedAt: deleteField(),
      });
    }
    await batch.commit();
  }

  logger.log(`🔒 ${stale.length} categoría(s) dejan de exponer su ganador públicamente.`);
  return stale.length;
}

/**
 * Borra los ganadores de la edición en curso (reinicio anual).
 * @returns {Promise<void>}
 */
export async function clearWinners() {
  try {
    await deleteDoc(winnersDoc());
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'winnersService - clearWinners',
    });
    throw error;
  }
}
