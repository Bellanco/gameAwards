/**
 * Semántica del calendario de votación (`config/voting`).
 *
 * El admin fija tres días desde la pestaña Temporada y de ahí salen los tres
 * instantes que gobiernan la app:
 *
 *   opensAt   -> desde cuándo se puede votar   (00:00 del día elegido)
 *   closesAt  -> hasta cuándo se puede votar   (23:59 del día elegido)
 *   resultsAt -> cuándo se publican resultados (23:59 del día elegido)
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

/** Estados posibles de la votación, para pintar la UI del panel. */
export const VOTING_STATE = {
  SCHEDULED: 'scheduled', // aún no ha llegado la fecha de apertura
  OPEN: 'open',
  CLOSED: 'closed', // cerrada por fecha o forzada por el admin
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
 * ¿Están ya publicados los resultados?
 *
 * Sin fecha de resultados NO se publica nada: publicar por defecto expondría la
 * clasificación en cuanto el admin marcara el primer ganador.
 *
 * @param {Object} config
 * @param {number} [now]
 * @returns {boolean}
 */
export const areResultsPublished = (config, now = Date.now()) => {
  const millis = config?.resultsAtMillis;
  return millis != null && now >= millis;
};

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
 * Comprueba que los tres días elegidos sean coherentes entre sí.
 * Se comparan como cadenas 'YYYY-MM-DD', que ordenan igual que las fechas.
 *
 * @param {{opensDay?: string, closesDay?: string, resultsDay?: string}} days
 * @returns {string|null} clave i18n del error, o null si todo encaja
 */
export const validateScheduleDays = ({ opensDay, closesDay, resultsDay } = {}) => {
  if (opensDay && closesDay && closesDay < opensDay) return 'errorCloseBeforeOpen';
  if (closesDay && resultsDay && resultsDay < closesDay) return 'errorResultsBeforeClose';
  if (!closesDay && resultsDay && opensDay && resultsDay < opensDay) {
    return 'errorResultsBeforeClose';
  }
  return null;
};
