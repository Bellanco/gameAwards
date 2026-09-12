/**
 * Semántica del calendario de votación (`config/voting`).
 *
 * UNA EDICIÓN TIENE UNA SOLA FECHA: la de cierre. Se elige al abrirla y de ahí
 * sale el instante que gobierna la app:
 *
 *   closesAt  -> hasta cuándo se puede votar   (23:59 del día elegido)
 *
 * Antes había tres (apertura, cierre y publicación de resultados) y el panel
 * pedía las tres por separado: demasiadas piezas para un ciclo que en realidad
 * es abrir, cerrar y publicar. Ahora la edición se abre al crearla y se publica
 * cuando el admin la archiva (ver `lastPublishedId` más abajo).
 *
 * `opensAtMillis` se sigue respetando si existe, porque las ediciones creadas
 * con el modelo anterior lo tienen guardado; simplemente ya no se pide.
 *
 * Reglas de convivencia con el interruptor manual (`isOpen`):
 *  - Las FECHAS mandan: fuera de la ventana nadie vota, aunque isOpen sea true.
 *  - `isOpen: false` es un CIERRE FORZADO: cierra antes de tiempo, pero no puede
 *    abrir fuera de plazo. Así el interruptor nunca contradice al calendario.
 *  - Una fecha ausente (null) simplemente no restringe: sin `opensAt` la
 *    votación ya está abierta, y sin `closesAt` no se cierra sola.
 *
 * Estas funciones son PURAS y reciben el instante `now` para poder probarse.
 * La misma lógica de apertura vive replicada en firestore.rules
 * (`votingConfigAllows`), que es donde se cumple de verdad: aquí solo decide qué
 * pantalla se muestra.
 */

/** Estados posibles de la votación, para pintar la UI pública. */
export const VOTING_STATE = {
  SCHEDULED: 'scheduled', // aún no ha llegado la fecha de apertura
  OPEN: 'open',
  CLOSED: 'closed', // cerrada por fecha o forzada por el admin
};

/**
 * Momento del ciclo de vida de la edición, que es lo que pinta la pestaña
 * Temporada. Son tres y solo tres, y de cada uno sale UNA acción:
 *
 *   NONE    -> no hay edición en marcha        -> «Abrir votación»
 *   OPEN    -> se está votando                 -> «Cerrar ahora» (adelanta el cierre)
 *   PENDING -> cerrada, sin publicar todavía   -> «Publicar en el histórico»
 *
 * Publicar archiva la edición y la deja sin fecha de cierre, así que el ciclo
 * vuelve solo a NONE y se puede abrir la siguiente.
 */
export const SEASON_STAGE = {
  NONE: 'none',
  OPEN: 'open',
  PENDING: 'pending',
};

/**
 * ¿Se puede votar ahora mismo?
 * @param {Object} config - config/voting (con los campos *Millis)
 * @param {number} [now] - epoch en ms
 * @returns {boolean}
 */
export const isVotingOpenNow = (config, now = Date.now()) => {
  if (!config) return false;
  if (config.isOpen === false) return false;
  if (config.opensAtMillis != null && now < config.opensAtMillis) return false;
  if (config.closesAtMillis != null && now >= config.closesAtMillis) return false;
  return true;
};

/**
 * Estado de la votación para la UI: programada, abierta o cerrada.
 * @param {Object} config
 * @param {number} [now]
 * @returns {'scheduled'|'open'|'closed'}
 */
export const getVotingState = (config, now = Date.now()) => {
  if (isVotingOpenNow(config, now)) return VOTING_STATE.OPEN;
  if (
    config?.isOpen !== false &&
    config?.opensAtMillis != null &&
    now < config.opensAtMillis
  ) {
    return VOTING_STATE.SCHEDULED;
  }
  return VOTING_STATE.CLOSED;
};

/**
 * Momento del ciclo de vida de la edición (ver SEASON_STAGE).
 *
 * Lo que distingue «no hay edición» de «hay una» es la FECHA DE CIERRE: abrir
 * una edición la fija y publicarla la borra. No hace falta ninguna marca extra.
 *
 * @param {Object} config
 * @param {number} [now]
 * @returns {'none'|'open'|'pending'}
 */
export const getSeasonStage = (config, now = Date.now()) => {
  if (config?.closesAtMillis == null) return SEASON_STAGE.NONE;
  if (isVotingOpenNow(config, now)) return SEASON_STAGE.OPEN;
  return SEASON_STAGE.PENDING;
};

/**
 * ¿Hay resultados publicados que enseñar al público?
 *
 * Ya no depende de una fecha: publicar es el gesto de ARCHIVAR la edición, y al
 * hacerlo se apunta su id en `config/voting.lastPublishedId`. Así el visitante
 * resuelve el archivo con una sola lectura por id, sin listar la colección
 * (`results` solo deja leer lo ya archivado, y una consulta que tope con un
 * documento prohibido falla entera).
 *
 * @param {Object} config
 * @returns {boolean}
 */
export const areResultsPublished = (config) => Boolean(config?.lastPublishedId);

/**
 * Días completos que faltan para un instante (redondeando hacia arriba).
 * @param {number|null} millis
 * @param {number} [now]
 * @returns {number|null} null si no hay fecha
 */
export const daysUntil = (millis, now = Date.now()) => {
  if (millis == null) return null;
  return Math.max(0, Math.ceil((millis - now) / (1000 * 3600 * 24)));
};

/**
 * Valida el día de cierre elegido al abrir una edición.
 *
 * Se compara como cadena 'YYYY-MM-DD' contra el día de hoy, que ordenan igual
 * que las fechas. Se exige una fecha y que no esté en el pasado: una edición que
 * nace cerrada no le sirve a nadie y deja el panel en el estado «pendiente de
 * publicar» nada más crearla.
 *
 * @param {string} closesDay - 'YYYY-MM-DD'
 * @param {string} today - 'YYYY-MM-DD' en la zona de la votación
 * @returns {string|null} clave i18n del error, o null si el día vale
 */
export const validateClosingDay = (closesDay, today) => {
  if (!closesDay) return 'errorClosingDayRequired';
  if (today && closesDay < today) return 'errorClosingDayInThePast';
  return null;
};
