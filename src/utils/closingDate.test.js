import { buildClosingDate, endOfDayInVotingZone, VOTING_TIME_ZONE } from './closingDate';

/** Hora de pared en Europe/Madrid para un epoch dado, para poder afirmar sobre ella. */
const madridWallClock = (millis) =>
  new Intl.DateTimeFormat('es-ES', {
    timeZone: VOTING_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(millis));

describe('endOfDayInVotingZone', () => {
  it('devuelve las 23:59:59 de ese día en Madrid (horario de invierno, UTC+1)', () => {
    const millis = endOfDayInVotingZone('2026-01-15');
    expect(madridWallClock(millis)).toBe('15/01/2026, 23:59:59');
    // UTC+1 -> las 23:59:59 de Madrid son las 22:59:59 UTC
    expect(new Date(millis).toISOString()).toBe('2026-01-15T22:59:59.999Z');
  });

  it('devuelve las 23:59:59 de ese día en Madrid (horario de verano, UTC+2)', () => {
    const millis = endOfDayInVotingZone('2026-07-15');
    expect(madridWallClock(millis)).toBe('15/07/2026, 23:59:59');
    // UTC+2 -> las 23:59:59 de Madrid son las 21:59:59 UTC
    expect(new Date(millis).toISOString()).toBe('2026-07-15T21:59:59.999Z');
  });

  it('acierta también el día del cambio de hora', () => {
    // Último domingo de marzo de 2026: el día tiene 23 horas.
    expect(madridWallClock(endOfDayInVotingZone('2026-03-29'))).toBe('29/03/2026, 23:59:59');
    // Último domingo de octubre de 2026: el día tiene 25 horas.
    expect(madridWallClock(endOfDayInVotingZone('2026-10-25'))).toBe('25/10/2026, 23:59:59');
  });

  it('no depende del huso horario del proceso', () => {
    // El resultado es un instante absoluto: se afirma sobre el UTC resultante,
    // que no cambia aunque el admin administre desde otro país.
    expect(endOfDayInVotingZone('2026-12-01')).toBe(
      Date.parse('2026-12-01T22:59:59.999Z')
    );
  });

  it('devuelve null si el día no tiene formato válido', () => {
    expect(endOfDayInVotingZone('01/12/2026')).toBeNull();
    expect(endOfDayInVotingZone('')).toBeNull();
    expect(endOfDayInVotingZone(null)).toBeNull();
    expect(endOfDayInVotingZone(undefined)).toBeNull();
  });
});

describe('buildClosingDate', () => {
  it('devuelve ISO y epoch coherentes entre sí', () => {
    const { closesAt, closesAtMillis } = buildClosingDate('2026-12-01');
    expect(closesAtMillis).toBe(Date.parse(closesAt));
    expect(closesAt).toBe('2026-12-01T22:59:59.999Z');
  });

  it('devuelve ambos campos a null al limpiar la fecha', () => {
    // Importante: `closesAtMillis` es el campo que leen las reglas; si se
    // quedara con valor mientras `closesAt` es null, el plazo seguiría vigente.
    expect(buildClosingDate(null)).toEqual({ closesAt: null, closesAtMillis: null });
    expect(buildClosingDate('')).toEqual({ closesAt: null, closesAtMillis: null });
  });

  it('devuelve null ante un día inválido en vez de una fecha inventada', () => {
    expect(buildClosingDate('no-es-una-fecha')).toEqual({
      closesAt: null,
      closesAtMillis: null,
    });
  });
});
