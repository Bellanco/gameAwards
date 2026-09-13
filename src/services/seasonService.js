/**
 * Servicio de gestión de temporadas (ediciones anuales).
 *
 * El ciclo de vida de una edición tiene TRES pasos y cada uno es una función:
 *
 *   openSeason()             abrir   -> nombre + fecha de cierre, y a votar
 *   closeSeasonNow()         cerrar  -> adelanta el cierre (opcional: la fecha
 *                                        lo hace sola)
 *   publishAndArchiveSeason() publicar -> archiva en `results/{seasonId}`, borra
 *                                        los votos y deja todo listo para la
 *                                        siguiente
 *
 * Publicar es lo que hace VISIBLE la edición al público: el archivo queda con
 * `closedAt` (que es lo que las reglas dejan leer sin sesión) y su id se apunta
 * en `config/voting.lastPublishedId`. Mientras la edición está viva no existe
 * ningún snapshot público, así que no hay nada que filtrar.
 *
 * Todas las escrituras aquí requieren un usuario admin (ver firestore.rules).
 */

import {
  doc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { computeLeaderboard } from '../utils/scoring';
import { fetchWinners, clearWinners, clearLegacyWinnerField } from './winnersService';
import { buildScheduleFields } from '../utils/closingDate';
import { getSeasonId, getSeasonLabel, toSeasonId } from '../utils/seasonId';
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
 * Renombra una edición ya archivada.
 *
 * Solo el nombre: los ganadores y la clasificación son el resultado histórico y
 * no se pueden recalcular (los votos de esa edición ya se borraron al
 * reiniciar), así que tocarlos dejaría el archivo incoherente.
 *
 * @param {string} seasonId - id del documento en `results`
 * @param {string} name
 */
export async function renameSeasonResult(seasonId, name) {
  await updateDoc(doc(db, 'results', String(seasonId)), {
    name: (name || '').trim(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Abre una edición nueva: le pone nombre y fecha de cierre, y deja la votación
 * abierta desde ya.
 *
 * UNA SOLA FECHA. El día elegido se guarda en dos formatos, que viajan siempre
 * juntos: `closesAt` (ISO) lo lee el cliente para mostrarlo y `closesAtMillis`
 * (epoch) lo comparan las reglas de Firestore, que no saben parsear una cadena
 * ISO. Escribir uno sin el otro dejaría el plazo sin efecto en el servidor. El
 * instante se fija en Europe/Madrid, no en la hora local del administrador (ver
 * utils/closingDate.js).
 *
 * Se limpian `opensAt`/`resultsAt`: ya no se piden, y heredarlos de una edición
 * anterior dejaría la nueva programada para un día pasado o publicándose sola.
 *
 * @param {{name?: string, closesDay: string, season?: number}} params
 * @returns {Promise<{seasonId: string, name: string, closesAt: string}>}
 */
export async function openSeason({ name, closesDay, season }) {
  const year = typeof season === 'number' ? season : new Date().getFullYear();
  const nombre = (name || '').trim();
  const id = toSeasonId(nombre) || String(year);

  const { closesAt, closesAtMillis } = buildScheduleFields({ closesDay });
  if (closesAtMillis == null) throw new Error('La edición necesita una fecha de cierre');

  try {
    await setDoc(
      VOTING_DOC,
      {
        isOpen: true,
        season: year,
        seasonId: id,
        seasonName: nombre,
        closesAt,
        closesAtMillis,
        opensAt: null,
        opensAtMillis: null,
        resultsAt: null,
        resultsAtMillis: null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    logger.log(`🗳️ Edición "${getSeasonLabel({ name: nombre, season: year })}" abierta hasta ${closesAt}.`);
    return { seasonId: id, name: nombre, closesAt };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'seasonService - openSeason',
      season: year,
    });
    throw error;
  }
}

/**
 * Adelanta el cierre de la edición en curso.
 *
 * No borra la fecha: la edición sigue existiendo y pasa a «pendiente de
 * publicar». `isOpen: false` es un cierre forzado y las reglas lo respetan igual
 * que la fecha (ver votingConfigAllows en firestore.rules).
 */
export async function closeSeasonNow() {
  await setVotingOpen(false);
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
 * ESTE ES EL ÚNICO CANAL PÚBLICO de los ganadores y de la clasificación: los
 * ganadores viven en `admin/winners` y los votos en `ballots`, ninguno de
 * lectura pública. Por eso el documento no lleva el UID de nadie, solo su huella
 * (ver utils/pseudonym.js): basta para que la pantalla diga «esta fila eres tú»
 * y no publica el identificador real de ninguna cuenta.
 *
 * @param {{season: number, categories: Array, ballots: Array,
 *          winners: Object.<string,string>}} params
 * @returns {{season: number, winners: Object, categoriesSnapshot: Array,
 *            leaderboard: Array, totalBallots: number}}
 */
export function buildSeasonSnapshot({ season, categories, ballots, winners, seasonId, seasonName }) {
  const resolvedWinners = {};
  const categoriesSnapshot = (categories || []).map((cat) => {
    // El mapa manda; `cat.winner` solo actúa de respaldo para datos todavía sin
    // migrar al documento `admin/winners`.
    const winner = winners?.[cat.id] || cat.winner || null;
    if (winner) resolvedWinners[cat.id] = winner;
    return {
      id: cat.id,
      title: cat.title,
      winner,
      weight: cat.weight || 1,
      options: cat.options || [],
    };
  });

  const id = getSeasonId({ seasonId, season });

  // El UID se queda fuera del documento publicado; la huella ocupa su lugar.
  const leaderboard = computeLeaderboard(ballots || [], categories || [], resolvedWinners).map(
    // eslint-disable-next-line no-unused-vars
    ({ userId, ...entry }) => entry
  );

  return {
    season,
    // Identidad de la edición: el id es además la clave del documento, y el
    // nombre lo que se ve en el histórico. Sin nombre se cae al año, que es lo
    // que tenían las ediciones anteriores a esta feature.
    seasonId: id,
    name: getSeasonLabel({ name: seasonName, season }),
    winners: resolvedWinners,
    categoriesSnapshot,
    leaderboard,
    totalBallots: (ballots || []).length,
  };
}

/**
 * PUBLICA la edición: la archiva, la hace visible para todo el mundo y deja el
 * panel listo para abrir la siguiente. Es el último paso del ciclo y el único
 * destructivo.
 *
 * 1. Calcula ganadores (`admin/winners`) y clasificación con puntos.
 * 2. Escribe `results/{seasonId}` con el snapshot y `closedAt`, que es
 *    justamente lo que las reglas dejan leer sin sesión: publicar = archivar.
 * 3. Borra todos los documentos de `ballots` en lotes. Hace falta para poder
 *    abrir otra edición: el bloqueo de re-voto va por usuario, así que sin
 *    borrar nadie podría volver a votar. La clasificación y los ganadores
 *    quedan en el archivo; el detalle por persona no se conserva.
 * 4. Vacía los nominados de cada categoría (options/optionIds) SIN borrar
 *    los documentos: las categorías se mantienen año a año; solo cambian los
 *    nominados. NUNCA se elimina la colección `categories` aquí.
 * 5. Deja `config/voting` sin edición: sin fecha de cierre (que es lo que
 *    distingue «hay edición» de «no la hay»), cerrada, y con `lastPublishedId`
 *    apuntando al archivo recién escrito para que el público lo encuentre de
 *    una sola lectura.
 *
 * @param {Object} params
 * @param {number} params.season - Año/temporada a archivar
 * @param {Array} params.categories - Categorías de la edición
 * @param {Object.<string,string>} [params.winners] - Ganadores (se leen si falta)
 * @param {Array} params.ballots - Votos de la temporada
 * @returns {Promise<{seasonId: string, name: string, totalBallots: number,
 *                    deleted: number, cleared: number}>}
 */
export async function publishAndArchiveSeason({ season, categories, ballots, winners, seasonId, seasonName }) {
  try {
    // 1 + 2. Construir y guardar el snapshot de resultados de la temporada.
    const resolved = winners || (await fetchWinners(categories));
    const snapshot = buildSeasonSnapshot({
      season, categories, ballots, winners: resolved, seasonId, seasonName,
    });

    await setDoc(doc(db, 'results', snapshot.seasonId), {
      ...snapshot,
      closedAt: serverTimestamp(),
    });

    logger.log(`📦 ${snapshot.name} archivada en results/${snapshot.seasonId}.`);

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
    // Los ganadores de la edición que se cierra: fuera de `admin/winners` (ya
    // están archivados en el snapshot) y fuera del campo `winner` que pudiera
    // quedar en alguna categoría sin migrar.
    await clearWinners();
    await clearLegacyWinnerField(categories);
    let cleared = 0;
    batch = writeBatch(db);
    opsInBatch = 0;

    for (const catDoc of categoriesSnap.docs) {
      batch.update(catDoc.ref, {
        options: [],
        optionIds: [],
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

    // 5. Cerrar el ciclo: sin edición en marcha y con el archivo publicado.
    //    `closesAt` a null es lo que devuelve el panel al estado «no hay
    //    edición»; `lastPublishedId` es lo que el público usa para encontrar el
    //    archivo sin listar la colección.
    await setDoc(
      VOTING_DOC,
      {
        isOpen: false,
        season: season + 1,
        seasonId: '',
        seasonName: '',
        closesAt: null,
        closesAtMillis: null,
        opensAt: null,
        opensAtMillis: null,
        resultsAt: null,
        resultsAtMillis: null,
        lastPublishedId: snapshot.seasonId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    logger.log(`📣 "${snapshot.name}" publicada en el histórico.`);

    return {
      seasonId: snapshot.seasonId,
      name: snapshot.name,
      totalBallots: (ballots || []).length,
      deleted,
      cleared,
    };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'seasonService - publishAndArchiveSeason',
      season,
    });
    throw error;
  }
}
