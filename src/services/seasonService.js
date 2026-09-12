/**
 * Servicio de gestión de temporadas (ediciones anuales).
 *
 * Responsabilidades:
 *  - Fijar el calendario de la edición: apertura, cierre y publicación de
 *    resultados (`config/voting`), además del cierre forzado y la temporada.
 *  - Archivar los resultados de una edición en `results/{season}` (ganadores +
 *    clasificación con los puntos de cada usuario) antes de reiniciar.
 *  - Publicar los resultados de la temporada en curso sin destruir nada.
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
import { buildScheduleFields } from '../utils/closingDate';
import { logError, ERROR_TYPES } from './errorService';
import logger from './loggerService';

const VOTING_DOC = doc(db, 'config', 'voting');

/**
 * Cierre forzado / reapertura manual de la votación (`config/voting.isOpen`).
 *
 * OJO con la semántica: `isOpen` ya no abre por sí solo. Manda el calendario
 * (ver utils/votingSchedule.js) y este campo solo puede cerrar antes de tiempo;
 * ponerlo a true fuera de la ventana de fechas no habilita el voto, ni en el
 * cliente ni en las reglas.
 *
 * @param {boolean} isOpen
 * @param {{season?: number}} [extra]
 */
export async function setVotingOpen(isOpen, extra = {}) {
  await setDoc(
    VOTING_DOC,
    {
      isOpen,
      ...(typeof extra.season === 'number' ? { season: extra.season } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Fija (o limpia) el calendario completo de la edición.
 *
 * Recibe los tres DÍAS elegidos en el panel ('YYYY-MM-DD') y guarda SEIS campos,
 * un par por fecha: el ISO que lee el cliente y el epoch en ms que comparan las
 * reglas de Firestore (no saben parsear una cadena ISO). Los pares viajan
 * siempre juntos: escribir uno sin el otro dejaría el plazo sin efecto en
 * servidor. Los instantes se fijan en Europe/Madrid, no en la hora local del
 * administrador (ver utils/closingDate.js).
 *
 * Pasa null o '' en cualquiera de los días para quitar esa fecha.
 *
 * @param {{opensDay?: string|null, closesDay?: string|null, resultsDay?: string|null}} days
 * @returns {Promise<Object>} Los campos escritos (ISO + epoch de cada fecha)
 */
export async function setVotingSchedule(days) {
  const schedule = buildScheduleFields(days);
  await setDoc(
    VOTING_DOC,
    { ...schedule, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return schedule;
}

/**
 * Snapshot de resultados de una temporada: ganadores por categoría, foto de las
 * categorías (para poder mostrar los nombres aunque después se editen) y la
 * clasificación con los puntos de cada participante.
 *
 * Vive aquí, y no en cada llamador, porque lo escriben dos caminos distintos:
 * la publicación de resultados y el archivado del reinicio anual. Si divergieran,
 * el histórico y la pantalla pública mostrarían cosas diferentes.
 *
 * @param {{season: number, categories: Array, ballots: Array}} params
 * @returns {{season: number, winners: Object, categoriesSnapshot: Array,
 *            leaderboard: Array, totalBallots: number}}
 */
export function buildSeasonSnapshot({ season, categories, ballots }) {
  const winners = {};
  const categoriesSnapshot = (categories || []).map((cat) => {
    if (cat.winner) winners[cat.id] = cat.winner;
    return {
      id: cat.id,
      title: cat.title,
      winner: cat.winner || null,
      weight: cat.weight || 1,
      options: cat.options || [],
    };
  });

  return {
    season,
    winners,
    categoriesSnapshot,
    leaderboard: computeLeaderboard(ballots || [], categories || []),
    totalBallots: (ballots || []).length,
  };
}

/**
 * Publica (o actualiza) los resultados de la temporada en curso en
 * `results/{season}`, SIN borrar votos ni tocar las categorías.
 *
 * Es lo que hace visible la pantalla pública de resultados: `ballots` no es de
 * lectura pública (solo dueño o admin), así que la clasificación no se puede
 * calcular en el navegador de un visitante; tiene que existir este snapshot, que
 * sí es público. La FECHA de publicación (`resultsAt`) decide cuándo se muestra;
 * esta función decide QUÉ se muestra.
 *
 * Se vuelve a llamar cada vez que el admin guarda ganadores o el calendario, así
 * que el snapshot se mantiene al día mientras la edición está viva.
 *
 * @param {{season: number, categories: Array, ballots: Array}} params
 * @returns {Promise<{season: number, winnersCount: number, totalBallots: number}>}
 */
export async function publishSeasonResults({ season, categories, ballots }) {
  try {
    const snapshot = buildSeasonSnapshot({ season, categories, ballots });

    await setDoc(doc(db, 'results', String(season)), {
      ...snapshot,
      publishedAt: serverTimestamp(),
    });

    logger.log(`📣 Resultados de la temporada ${season} publicados/actualizados.`);

    return {
      season,
      winnersCount: Object.keys(snapshot.winners).length,
      totalBallots: snapshot.totalBallots,
    };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'seasonService - publishSeasonResults',
      season,
    });
    throw error;
  }
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
    const snapshot = buildSeasonSnapshot({ season, categories, ballots });

    await setDoc(doc(db, 'results', String(season)), {
      ...snapshot,
      closedAt: serverTimestamp(),
    });

    logger.log(`📦 Resultados de la temporada ${season} archivados.`);

    // 3. Borrar ballots en lotes (límite de 500 por batch en Firestore).
    const ballotsSnap = await getDocs(collection(db, 'ballots'));
    let deleted = 0;
    let batch = writeBatch(db);
    let opsInBatch = 0;

    for (const ballotDoc of ballotsSnap.docs) {
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
