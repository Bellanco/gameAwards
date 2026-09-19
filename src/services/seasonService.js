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
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { computeLeaderboard } from '../utils/scoring';
import { fetchWinners, clearWinners, clearLegacyWinnerField } from './winnersService';
import { buildScheduleFields } from '../utils/closingDate';
import { getSeasonId, getSeasonLabel, toSeasonId } from '../utils/seasonId';
import { hasTitle } from '../utils/localize';
import { logError, ERROR_TYPES } from './errorService';
import logger from './loggerService';

const VOTING_DOC = doc(db, 'config', 'voting');

/** Límite de operaciones por lote en Firestore. */
const BATCH_LIMIT = 500;

/**
 * Lee de Firestore la foto REAL de la edición viva: los votos emitidos y las
 * categorías tal y como están ahora mismo.
 *
 * Existe porque archivar una edición con lo que tuviera en memoria el panel es
 * exactamente el bug que se arregló aquí: el AdminPanel carga `ballots` y
 * `categories` UNA vez al montarse, así que una pestaña abierta desde la
 * edición anterior publicaba la clasificación anterior —los mismos votantes,
 * las mismas opciones— por mucho que en Firestore hubiera otra cosa. Publicar
 * es irreversible y destructivo: tiene que mirar el dato, no la pantalla.
 *
 * Devuelve además los `docs` crudos porque la limpieza posterior reutiliza estas
 * mismas lecturas: así lo que se archiva y lo que se retira son, por
 * construcción, el mismo conjunto.
 *
 * La usa también la vista previa de la pestaña Temporada (`useSeasonPreview`),
 * para que lo que el admin comprueba antes de publicar sea, literalmente, lo que
 * se va a publicar.
 *
 * @returns {Promise<{ballots: Array, categories: Array, ballotDocs: Array,
 *                    categoryDocs: Array}>}
 */
export async function readLiveEdition() {
  const [ballotsSnap, categoriesSnap] = await Promise.all([
    getDocs(collection(db, 'ballots')),
    getDocs(collection(db, 'categories')),
  ]);

  const ballots = ballotsSnap.docs.map((d) => ({ userId: d.id, ...d.data() }));
  const allCategories = categoriesSnap.docs.map((d) => ({ id: d.id, docId: d.id, ...d.data() }));

  // Para el archivo solo cuentan las categorías votables, igual que en el resto
  // de la app (useFirestoreCategories con includeInvalid = false): un
  // placeholder sin título ni nominados solo añadiría filas vacías al histórico.
  const categories = allCategories
    .filter((cat) => !cat.isPlaceholder && hasTitle(cat) && cat.options?.length > 0)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return {
    ballots,
    categories,
    ballotDocs: ballotsSnap.docs,
    categoryDocs: categoriesSnap.docs,
  };
}

/**
 * Borra en lotes los documentos que se le pasen (Firestore admite 500
 * operaciones por batch).
 *
 * @param {Array} docs - documentos de un QuerySnapshot
 * @returns {Promise<number>} cuántos se borraron
 */
async function discardDocsInBatches(docs) {
  let deleted = 0;
  let batch = writeBatch(db);
  let opsInBatch = 0;

  for (const document of docs) {
    batch.delete(document.ref);
    opsInBatch += 1;
    deleted += 1;
    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) await batch.commit();

  return deleted;
}

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
 * BORRA una edición archivada del histórico. Irreversible y sin red: el archivo
 * es lo ÚNICO que queda de esa edición (sus votos y sus ganadores se retiraron
 * al publicarla), así que esto no deja rastro que recuperar.
 *
 * Existe para las pruebas: abrir, votar y publicar una edición de prueba deja un
 * archivo permanente en el histórico, y sin esto el listado se llena de «Test»
 * que no se pueden quitar desde la aplicación.
 *
 * NO BASTA CON BORRAR EL DOCUMENTO. Si la edición era la última publicada,
 * `config/voting.lastPublishedId` seguiría apuntándola y la pantalla pública de
 * resultados se quedaría pidiendo un archivo que ya no existe. Se reapunta a la
 * edición más reciente que quede —para que el público vuelva a ver la anterior,
 * no un hueco— y, si no queda ninguna, se deja vacío, que es como estaba antes
 * de la primera publicación.
 *
 * @param {string} seasonId - id del documento en `results`
 * @returns {Promise<{seasonId: string, lastPublishedId: string, wasPublished: boolean}>}
 */
export async function deleteSeasonResult(seasonId) {
  const id = String(seasonId);

  try {
    await deleteDoc(doc(db, 'results', id));

    const configSnap = await getDoc(VOTING_DOC);
    const wasPublished = configSnap.exists() && configSnap.data()?.lastPublishedId === id;
    let lastPublishedId = configSnap.exists() ? configSnap.data()?.lastPublishedId || '' : '';

    if (wasPublished) {
      // Se lee DESPUÉS del borrado, así que la edición que se va nunca puede
      // salir elegida. Más reciente = temporada mayor; a igualdad, el id ordena
      // de forma estable (puede haber varias ediciones en el mismo año).
      const remaining = await getDocs(collection(db, 'results'));
      const candidates = remaining.docs
        .map((d) => ({ id: d.id, season: d.data()?.season || 0 }))
        .sort((a, b) => b.season - a.season || b.id.localeCompare(a.id));
      lastPublishedId = candidates[0]?.id || '';

      await setDoc(
        VOTING_DOC,
        { lastPublishedId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }

    logger.log(`🗑️ Edición ${id} borrada del histórico.`);
    return { seasonId: id, lastPublishedId, wasPublished };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'seasonService - deleteSeasonResult',
      seasonId: id,
    });
    throw error;
  }
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
 * LA MESA SE LIMPIA ANTES DE EMPEZAR. Solo se puede abrir una edición cuando no
 * hay ninguna en marcha (`SEASON_STAGE.NONE`), así que cualquier papeleta o
 * ganador que siga en Firestore es un resto de la anterior —una publicación que
 * se quedó a medias, una prueba hecha a mano en la consola— y contaminaría la
 * nueva: esas papeletas entrarían tal cual en el siguiente archivo, con sus
 * votantes y sus opciones de la edición pasada, y además sus dueños no podrían
 * votar por el bloqueo de re-voto. Se retiran aquí y se informa de cuántas eran.
 *
 * @param {{name?: string, closesDay: string, season?: number}} params
 * @returns {Promise<{seasonId: string, name: string, closesAt: string,
 *                    leftovers: number}>}
 */
export async function openSeason({ name, closesDay, season }) {
  const year = typeof season === 'number' ? season : new Date().getFullYear();
  const nombre = (name || '').trim();
  const id = toSeasonId(nombre) || String(year);

  const { closesAt, closesAtMillis } = buildScheduleFields({ closesDay });
  if (closesAtMillis == null) throw new Error('La edición necesita una fecha de cierre');

  try {
    // Restos de una edición anterior mal cerrada: se retiran antes de abrir.
    const leftoverBallots = await getDocs(collection(db, 'ballots'));
    const leftovers = await discardDocsInBatches(leftoverBallots.docs);
    if (leftovers > 0) {
      logger.warn(`🧽 ${leftovers} papeleta(s) de una edición anterior retiradas al abrir la nueva.`);
      // Los ganadores marcados también sobran: una edición empieza sin ninguno.
      await clearWinners();
    }

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
    return { seasonId: id, name: nombre, closesAt, leftovers };
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
 * 0. LEE DE FIRESTORE las papeletas y las categorías de la edición. No las
 *    recibe de quien llama: el panel las carga una sola vez al montarse y
 *    publicar es irreversible, así que archivar lo que hubiera en pantalla
 *    significaba, con una pestaña abierta desde la edición anterior, publicar la
 *    clasificación de la edición anterior. Lo que se archiva y lo que se limpia
 *    salen de la MISMA lectura, así que no pueden divergir.
 * 1. Calcula ganadores (`admin/winners`) y clasificación con puntos.
 * 2. Escribe `results/{seasonId}` con el snapshot y `closedAt`, que es
 *    justamente lo que las reglas dejan leer sin sesión: publicar = archivar.
 * 3. Retira todos los documentos de `ballots` en lotes. Hace falta para poder
 *    abrir otra edición: el bloqueo de re-voto va por usuario, así que sin
 *    hacerlo nadie podría volver a votar. La clasificación y los ganadores
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
 * @param {string} [params.seasonId] - Identificador de la edición
 * @param {string} [params.seasonName] - Nombre visible de la edición
 * @param {Object.<string,string>} [params.winners] - Ganadores (se leen si falta)
 * @returns {Promise<{seasonId: string, name: string, totalBallots: number,
 *                    deleted: number, cleared: number}>}
 */
export async function publishAndArchiveSeason({ season, winners, seasonId, seasonName }) {
  try {
    // 0. La foto real de la edición, recién leída de Firestore.
    const { ballots, categories, ballotDocs, categoryDocs } = await readLiveEdition();

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

    // 3. Retirar las papeletas ya archivadas, exactamente las mismas que
    //    acaban de entrar en el snapshot (misma lectura del paso 0).
    const deleted = await discardDocsInBatches(ballotDocs);

    logger.log(`🗑️ ${deleted} votos retirados para reiniciar la edición.`);

    // 4. Vaciar nominados de cada categoría conservando el documento.
    //    Se recorren TODAS las categorías del paso 0 (también las inválidas,
    //    que no entran en el archivo) para garantizar que ninguna quede con
    //    nominados del año anterior. Solo `update` (nunca `delete`): título,
    //    peso, orden e isActive se preservan. Los nominados viejos ya quedaron
    //    archivados en `results/{seasonId}`.
    //    Los ganadores de la edición que se cierra: fuera de `admin/winners` (ya
    //    están archivados en el snapshot) y fuera del campo `winner` que pudiera
    //    quedar en alguna categoría sin migrar.
    await clearWinners();
    await clearLegacyWinnerField(categories);
    let cleared = 0;
    let batch = writeBatch(db);
    let opsInBatch = 0;

    for (const catDoc of categoryDocs) {
      batch.update(catDoc.ref, {
        options: [],
        optionIds: [],
        updatedAt: new Date().toISOString(),
      });
      opsInBatch += 1;
      cleared += 1;
      if (opsInBatch === BATCH_LIMIT) {
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
      totalBallots: snapshot.totalBallots,
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
