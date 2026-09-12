/**
 * Cálculo del instante de cierre de la votación.
 *
 * La fecha de cierre se elige como un DÍA ('YYYY-MM-DD') en el panel de admin,
 * pero el cierre real es un INSTANTE, y ese instante ahora lo comparan también
 * las reglas de Firestore (`closesAtMillis`). Por eso no puede depender del huso
 * horario del navegador del administrador: antes se hacía
 * `new Date('YYYY-MM-DDT23:59:59')`, que se interpreta en hora local, así que
 * administrar desde otro huso desplazaba el cierre hasta ±12 h.
 *
 * Se fija en **Europe/Madrid**, que es la zona de la votación. El cálculo usa
 * `Intl` (sin dependencias) y una segunda pasada para acertar también en los
 * días de cambio de hora, cuando el desfase del día no es el de la medianoche.
 */

/** Zona horaria de referencia de la votación. */
export const VOTING_TIME_ZONE = 'Europe/Madrid';

const tzFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: VOTING_TIME_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * Desfase de Europe/Madrid respecto a UTC, en ms, para un instante dado.
 * @param {Date} instant
 * @returns {number}
 */
const zoneOffsetMs = (instant) => {
  const parts = Object.fromEntries(
    tzFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );

  // `hour` puede venir como 24 para la medianoche con hour12:false.
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second
  );

  // `formatToParts` no devuelve milisegundos, así que `asIfUtc` está truncado al
  // segundo: hay que truncar también el instante o el desfase sale corto (y la
  // hora de cierre se desplaza casi un segundo).
  const truncatedToSecond = Math.floor(instant.getTime() / 1000) * 1000;

  return asIfUtc - truncatedToSecond;
};

/**
 * Instante (epoch en ms) del final de un día en Europe/Madrid: 23:59:59.999.
 * @param {string} day - 'YYYY-MM-DD'
 * @returns {number|null} epoch en ms, o null si el día no es válido
 */
export const endOfDayInVotingZone = (day) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null;

  const [year, month, date] = day.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, date, 23, 59, 59, 999);

  // Primera aproximación con el desfase de ese instante...
  let instant = wallClock - zoneOffsetMs(new Date(wallClock));
  // ...y segunda pasada, por si el día tiene cambio de hora y el desfase difiere.
  instant = wallClock - zoneOffsetMs(new Date(instant));

  return instant;
};

/**
 * Fecha de cierre a partir del día elegido, en los dos formatos que necesita la
 * app: ISO para mostrar en el cliente y epoch en ms para comparar en las reglas.
 * @param {string|null} day - 'YYYY-MM-DD' o null para quitar la fecha
 * @returns {{closesAt: string|null, closesAtMillis: number|null}}
 */
export const buildClosingDate = (day) => {
  const millis = day ? endOfDayInVotingZone(day) : null;
  if (millis === null) return { closesAt: null, closesAtMillis: null };
  return { closesAt: new Date(millis).toISOString(), closesAtMillis: millis };
};
