/**
 * Cálculo de los instantes del calendario de votación (apertura, cierre y
 * publicación de resultados).
 *
 * Las fechas se eligen como un DÍA ('YYYY-MM-DD') en el panel de admin, pero lo
 * que se guarda son INSTANTES, y el de cierre lo comparan también las reglas de
 * Firestore (`closesAtMillis`). Por eso no pueden depender del huso horario del
 * navegador del administrador: antes se hacía `new Date('YYYY-MM-DDT23:59:59')`,
 * que se interpreta en hora local, así que administrar desde otro huso
 * desplazaba el cierre hasta ±12 h.
 *
 * Todo se fija en **Europe/Madrid**, que es la zona de la votación. El cálculo
 * usa `Intl` (sin dependencias) y una segunda pasada para acertar también en los
 * días de cambio de hora, cuando el desfase del día no es el de la medianoche.
 *
 * Convenio de bordes del día:
 *  - apertura  -> 00:00:00.000 de ese día (empieza al entrar el día elegido).
 *  - cierre y resultados -> 23:59:59.999 (el día elegido se vive entero).
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
 * Instante (epoch en ms) de un borde del día en Europe/Madrid.
 * @param {string} day - 'YYYY-MM-DD'
 * @param {'start'|'end'} [boundary='end'] - 00:00:00.000 o 23:59:59.999
 * @returns {number|null} epoch en ms, o null si el día no es válido
 */
export const dayInstantInVotingZone = (day, boundary = 'end') => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null;

  const [year, month, date] = day.split('-').map(Number);
  const wallClock =
    boundary === 'start'
      ? Date.UTC(year, month - 1, date, 0, 0, 0, 0)
      : Date.UTC(year, month - 1, date, 23, 59, 59, 999);

  // Primera aproximación con el desfase de ese instante...
  let instant = wallClock - zoneOffsetMs(new Date(wallClock));
  // ...y segunda pasada, por si el día tiene cambio de hora y el desfase difiere.
  instant = wallClock - zoneOffsetMs(new Date(instant));

  return instant;
};

/**
 * Instante del final de un día en Europe/Madrid: 23:59:59.999.
 * @param {string} day - 'YYYY-MM-DD'
 * @returns {number|null}
 */
export const endOfDayInVotingZone = (day) => dayInstantInVotingZone(day, 'end');

/**
 * Instante del comienzo de un día en Europe/Madrid: 00:00:00.000.
 * @param {string} day - 'YYYY-MM-DD'
 * @returns {number|null}
 */
export const startOfDayInVotingZone = (day) => dayInstantInVotingZone(day, 'start');

/**
 * Día ('YYYY-MM-DD') al que pertenece un instante ISO **en Europe/Madrid**.
 *
 * Es la operación inversa que necesitan los `<input type="date">` del panel: si
 * se derivara el día con `getFullYear()/getMonth()` (hora local del admin), un
 * cierre a las 23:59 de Madrid se mostraría como el día siguiente o el anterior
 * al administrar desde otro huso.
 *
 * @param {string|null} iso
 * @returns {string} 'YYYY-MM-DD', o '' si no hay fecha válida
 */
export const toVotingZoneDay = (iso) => {
  if (!iso) return '';
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return '';

  const parts = Object.fromEntries(
    tzFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

/**
 * Suma días a un día 'YYYY-MM-DD' y devuelve el día resultante.
 * Se opera en UTC a mediodía para que el cambio de hora no desplace el día.
 * @param {string} day - 'YYYY-MM-DD'
 * @param {number} amount - días a sumar (puede ser negativo)
 * @returns {string} 'YYYY-MM-DD', o '' si el día de partida no es válido
 */
export const addDaysToDay = (day, amount) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return '';
  const [year, month, date] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + amount, 12));
  return shifted.toISOString().slice(0, 10);
};

/**
 * Día de hoy ('YYYY-MM-DD') en Europe/Madrid.
 * @returns {string}
 */
export const todayInVotingZone = () => toVotingZoneDay(new Date().toISOString());

/**
 * Campos del calendario de votación a partir de los días elegidos en el panel.
 *
 * Cada fecha viaja en DOS formatos y siempre juntos (ver seasonService):
 *  - `<x>At`: ISO, lo lee el cliente para mostrar y calcular días.
 *  - `<x>AtMillis`: epoch en ms, lo comparan las reglas de Firestore, que no
 *    saben parsear una cadena ISO.
 *
 * Un día vacío o inválido deja SU par de campos a null (fecha quitada), nunca a
 * medias: dejar el epoch con valor mientras el ISO es null mantendría vigente un
 * plazo que el admin cree haber borrado.
 *
 * @param {{opensDay?: string|null, closesDay?: string|null, resultsDay?: string|null}} days
 * @returns {{opensAt: string|null, opensAtMillis: number|null,
 *            closesAt: string|null, closesAtMillis: number|null,
 *            resultsAt: string|null, resultsAtMillis: number|null}}
 */
export const buildScheduleFields = ({ opensDay, closesDay, resultsDay } = {}) => {
  const pair = (day, boundary) => {
    const millis = day ? dayInstantInVotingZone(day, boundary) : null;
    return millis === null ? [null, null] : [new Date(millis).toISOString(), millis];
  };

  const [opensAt, opensAtMillis] = pair(opensDay, 'start');
  const [closesAt, closesAtMillis] = pair(closesDay, 'end');
  const [resultsAt, resultsAtMillis] = pair(resultsDay, 'end');

  return {
    opensAt,
    opensAtMillis,
    closesAt,
    closesAtMillis,
    resultsAt,
    resultsAtMillis,
  };
};
