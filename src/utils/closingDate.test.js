import {
  buildScheduleFields,
  endOfDayInVotingZone,
  startOfDayInVotingZone,
  toVotingZoneDay,
  addDaysToDay,
  VOTING_TIME_ZONE,
} from './closingDate';

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

describe('startOfDayInVotingZone', () => {
  it('devuelve las 00:00 de ese día en Madrid', () => {
    // UTC+2 en julio -> la medianoche de Madrid son las 22:00 UTC del día anterior.
    expect(new Date(startOfDayInVotingZone('2026-07-15')).toISOString()).toBe(
      '2026-07-14T22:00:00.000Z'
    );
    expect(madridWallClock(startOfDayInVotingZone('2026-07-15'))).toBe('15/07/2026, 00:00:00');
  });

  it('acierta el día del cambio de hora', () => {
    expect(madridWallClock(startOfDayInVotingZone('2026-03-29'))).toBe('29/03/2026, 00:00:00');
    expect(madridWallClock(startOfDayInVotingZone('2026-10-25'))).toBe('25/10/2026, 00:00:00');
  });

  it('devuelve null si el día no es válido', () => {
    expect(startOfDayInVotingZone('')).toBeNull();
  });
});

describe('toVotingZoneDay', () => {
  it('devuelve el día en Madrid, no en la hora local del proceso', () => {
    // 22:59:59Z del 1 de diciembre son las 23:59:59 del 1 en Madrid: el input de
    // fecha del panel debe mostrar el día 1, no el 2 ni el 30.
    expect(toVotingZoneDay('2026-12-01T22:59:59.999Z')).toBe('2026-12-01');
    // Y la medianoche de Madrid pertenece al día siguiente en UTC.
    expect(toVotingZoneDay('2026-07-14T22:00:00.000Z')).toBe('2026-07-15');
  });

  it('devuelve cadena vacía sin fecha válida', () => {
    expect(toVotingZoneDay(null)).toBe('');
    expect(toVotingZoneDay('no-es-una-fecha')).toBe('');
  });
});

describe('addDaysToDay', () => {
  it('suma días cruzando meses y cambios de hora', () => {
    expect(addDaysToDay('2026-06-15', 7)).toBe('2026-06-22');
    expect(addDaysToDay('2026-06-15', 14)).toBe('2026-06-29');
    expect(addDaysToDay('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDaysToDay('2026-10-24', 1)).toBe('2026-10-25'); // día de 25 horas
  });

  it('devuelve cadena vacía si el día de partida no es válido', () => {
    expect(addDaysToDay('', 7)).toBe('');
  });
});

describe('buildScheduleFields', () => {
  it('empareja cada fecha con su epoch y usa el borde correcto del día', () => {
    const fields = buildScheduleFields({
      opensDay: '2026-12-01',
      closesDay: '2026-12-08',
      resultsDay: '2026-12-15',
    });

    // La apertura entra a las 00:00 y el cierre agota el día elegido.
    expect(fields.opensAt).toBe('2026-11-30T23:00:00.000Z');
    expect(fields.closesAt).toBe('2026-12-08T22:59:59.999Z');
    expect(fields.resultsAt).toBe('2026-12-15T22:59:59.999Z');

    expect(fields.opensAtMillis).toBe(Date.parse(fields.opensAt));
    expect(fields.closesAtMillis).toBe(Date.parse(fields.closesAt));
    expect(fields.resultsAtMillis).toBe(Date.parse(fields.resultsAt));
  });

  it('deja a null el par completo de la fecha que se quita', () => {
    // Nunca a medias: un epoch huérfano mantendría vigente en las reglas un
    // plazo que el admin cree haber borrado.
    const fields = buildScheduleFields({ closesDay: '2026-12-08' });
    expect(fields).toEqual({
      opensAt: null,
      opensAtMillis: null,
      closesAt: '2026-12-08T22:59:59.999Z',
      closesAtMillis: Date.parse('2026-12-08T22:59:59.999Z'),
      resultsAt: null,
      resultsAtMillis: null,
    });
  });

  it('un calendario vacío deja los seis campos a null', () => {
    expect(buildScheduleFields({})).toEqual({
      opensAt: null,
      opensAtMillis: null,
      closesAt: null,
      closesAtMillis: null,
      resultsAt: null,
      resultsAtMillis: null,
    });
  });
});
