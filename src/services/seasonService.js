/**
 * Servicio de gestión de temporadas (ediciones anuales).
 *
 * Responsabilidades:
 *  - Abrir/cerrar la votación y fijar la temporada activa (`config/voting`).
 *  - Archivar los resultados de una edición en `results/{season}` (ganadores +
 *    clasificación con los puntos de cada usuario) antes de reiniciar.
 *  - Reiniciar la edición borrando los votos (`ballots`) tras archivar.
 *
 * Todas las escrituras aquí requieren un usuario admin (ver firestore.rules).
 */

import {
  doc,
  setDoc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { computeLeaderboard } from '../utils/scoring';
import { logError, ERROR_TYPES } from './errorService';
import logger from './loggerService';

const VOTING_DOC = doc(db, 'config', 'voting');

/**
 * Abre o cierra la votación.
 * @param {boolean} isOpen
 * @param {{season?: number, closesAt?: string|null}} [extra]
 */
export async function setVotingOpen(isOpen, extra = {}) {
  await setDoc(
    VOTING_DOC,
    {
      isOpen,
      ...(typeof extra.season === 'number' ? { season: extra.season } : {}),
      ...(extra.closesAt !== undefined ? { closesAt: extra.closesAt } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Fija la temporada activa (no abre ni cierra por sí misma).
 * @param {number} season
 */
export async function setSeason(season) {
  await setDoc(
    VOTING_DOC,
    { season, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Fija (o limpia) la fecha de cierre de la votación.
 * Recibe el día elegido en formato 'YYYY-MM-DD' y lo guarda como el instante
 * de ese día a las 23:59:59 (hora local). Pasa null para quitar la fecha.
 * @param {string|null} day - 'YYYY-MM-DD' o null
 */
export async function setClosingDate(day) {
  const closesAt = day ? new Date(`${day}T23:59:59`).toISOString() : null;
  await setDoc(
    VOTING_DOC,
    { closesAt, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return closesAt;
}

/**
 * Archiva los resultados de la temporada actual y reinicia la edición.
 *
 * 1. Calcula ganadores (category.winner = optionId) y clasificación con puntos.
 * 2. Escribe `results/{season}` con el snapshot (no destructivo).
 * 3. Borra todos los documentos de `ballots` en lotes.
 * 4. Vacía los nominados de cada categoría (options/optionIds/winner) SIN borrar
 *    los documentos: las categorías se mantienen año a año; solo cambian los
 *    nominados. NUNCA se elimina la colección `categories` aquí.
 *
 * @param {Object} params
 * @param {number} params.season - Año/temporada a archivar
 * @param {Array} params.categories - Categorías (con winner por optionId)
 * @param {Array} params.ballots - Votos de la temporada
 * @returns {Promise<{archived: boolean, totalBallots: number, deleted: number, cleared: number}>}
 */
export async function archiveAndResetSeason({ season, categories, ballots }) {
  try {
    // 1 + 2. Construir y guardar el snapshot de resultados de la temporada.
    const winners = {};
    const categoriesSnapshot = categories.map((cat) => {
      if (cat.winner) winners[cat.id] = cat.winner;
      return {
        id: cat.id,
        title: cat.title,
        winner: cat.winner || null,
        weight: cat.weight || 1,
        options: cat.options || [],
      };
    });

    const leaderboard = computeLeaderboard(ballots, categories);

    await setDoc(doc(db, 'results', String(season)), {
      season,
      winners,
      categoriesSnapshot,
      leaderboard,
      totalBallots: ballots.length,
      closedAt: serverTimestamp(),
    });

    logger.log(`📦 Resultados de la temporada ${season} archivados.`);

    // 3. Borrar ballots en lotes (límite de 500 por batch en Firestore).
    const snapshot = await getDocs(collection(db, 'ballots'));
    let deleted = 0;
    let batch = writeBatch(db);
    let opsInBatch = 0;

    for (const ballotDoc of snapshot.docs) {
      batch.delete(ballotDoc.ref);
      opsInBatch += 1;
      deleted += 1;
      if (opsInBatch === 500) {
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }
    if (opsInBatch > 0) await batch.commit();

    logger.log(`🗑️ ${deleted} votos eliminados para reiniciar la edición.`);

    // 4. Vaciar nominados de cada categoría conservando el documento.
    //    Leemos TODAS las categorías de Firestore (no solo las que llegan por
    //    parámetro) para garantizar que ninguna quede con nominados del año
    //    anterior. Solo `update` (nunca `delete`): título, peso, orden e
    //    isActive se preservan. Los nominados viejos ya quedaron archivados en
    //    `results/{season}`.
    const categoriesSnap = await getDocs(collection(db, 'categories'));
    let cleared = 0;
    batch = writeBatch(db);
    opsInBatch = 0;

    for (const catDoc of categoriesSnap.docs) {
      batch.update(catDoc.ref, {
        options: [],
        optionIds: [],
        winner: null,
        updatedAt: new Date().toISOString(),
      });
      opsInBatch += 1;
      cleared += 1;
      if (opsInBatch === 500) {
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }
    if (opsInBatch > 0) await batch.commit();

    logger.log(`🧹 Nominados vaciados en ${cleared} categorías (documentos conservados).`);

    return { archived: true, totalBallots: ballots.length, deleted, cleared };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'seasonService - archiveAndResetSeason',
      season,
    });
    throw error;
  }
}
