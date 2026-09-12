import {
  isVotingOpenNow,
  getVotingState,
  areResultsPublished,
  daysUntil,
  validateScheduleDays,
  VOTING_STATE,
} from './votingSchedule';

const NOW = Date.parse('2026-06-15T12:00:00.000Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** config/voting mínimo, con los campos que se quieran sobrescribir. */
const config = (overrides = {}) => ({
  isOpen: true,
  season: 2026,
  opensAtMillis: null,
  closesAtMillis: null,
  resultsAtMillis: null,
  ...overrides,
});

describe('isVotingOpenNow', () => {
  it('está abierta sin fechas configuradas (edición aún sin calendario)', () => {
    expect(isVotingOpenNow(config(), NOW)).toBe(true);
  });

  it('está cerrada antes de la fecha de apertura', () => {
    expect(isVotingOpenNow(config({ opensAtMillis: NOW + HOUR }), NOW)).toBe(false);
  });

  it('está abierta dentro de la ventana apertura-cierre', () => {
    const cfg = config({ opensAtMillis: NOW - DAY, closesAtMillis: NOW + DAY });
    expect(isVotingOpenNow(cfg, NOW)).toBe(true);
  });

  it('está cerrada pasada la fecha de cierre', () => {
    expect(isVotingOpenNow(config({ closesAtMillis: NOW - 1 }), NOW)).toBe(false);
  });

  it('el interruptor del admin cierra aunque estemos en plazo', () => {
    const cfg = config({ isOpen: false, opensAtMillis: NOW - DAY, closesAtMillis: NOW + DAY });
    expect(isVotingOpenNow(cfg, NOW)).toBe(false);
  });

  it('el interruptor NO abre fuera de la ventana de fechas', () => {
    // Es la regla que evita que "abrir votación" contradiga al calendario: la
    // misma comprobación vive en firestore.rules, que es quien la impone.
    const cfg = config({ isOpen: true, opensAtMillis: NOW + HOUR });
    expect(isVotingOpenNow(cfg, NOW)).toBe(false);
  });
});

describe('getVotingState', () => {
  it('distingue programada de cerrada', () => {
    expect(getVotingState(config({ opensAtMillis: NOW + HOUR }), NOW)).toBe(VOTING_STATE.SCHEDULED);
    expect(getVotingState(config({ closesAtMillis: NOW - HOUR }), NOW)).toBe(VOTING_STATE.CLOSED);
    expect(getVotingState(config(), NOW)).toBe(VOTING_STATE.OPEN);
  });

  it('un cierre forzado no se muestra como programada', () => {
    const cfg = config({ isOpen: false, opensAtMillis: NOW + HOUR });
    expect(getVotingState(cfg, NOW)).toBe(VOTING_STATE.CLOSED);
  });
});

describe('areResultsPublished', () => {
  it('sin fecha de resultados no se publica nada', () => {
    // Por defecto NO publicar: si no, la clasificación saldría a la luz en
    // cuanto el admin marcara el primer ganador.
    expect(areResultsPublished(config(), NOW)).toBe(false);
  });

  it('se publican al llegar la fecha', () => {
    expect(areResultsPublished(config({ resultsAtMillis: NOW + 1 }), NOW)).toBe(false);
    expect(areResultsPublished(config({ resultsAtMillis: NOW }), NOW)).toBe(true);
    expect(areResultsPublished(config({ resultsAtMillis: NOW - DAY }), NOW)).toBe(true);
  });
});

describe('daysUntil', () => {
  it('devuelve null sin fecha y nunca negativo', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil(NOW - 5 * DAY, NOW)).toBe(0);
    expect(daysUntil(NOW + 7 * DAY, NOW)).toBe(7);
  });
});

describe('validateScheduleDays', () => {
  it('acepta el escenario de prueba hoy / +7 / +14', () => {
    expect(
      validateScheduleDays({
        opensDay: '2026-06-15',
        closesDay: '2026-06-22',
        resultsDay: '2026-06-29',
      })
    ).toBeNull();
  });

  it('acepta días sueltos o el calendario vacío', () => {
    expect(validateScheduleDays({})).toBeNull();
    expect(validateScheduleDays({ closesDay: '2026-06-22' })).toBeNull();
  });

  it('rechaza un cierre anterior a la apertura', () => {
    expect(
      validateScheduleDays({ opensDay: '2026-06-15', closesDay: '2026-06-14' })
    ).toBe('errorCloseBeforeOpen');
  });

  it('rechaza resultados anteriores al cierre', () => {
    expect(
      validateScheduleDays({ closesDay: '2026-06-22', resultsDay: '2026-06-21' })
    ).toBe('errorResultsBeforeClose');
  });

  it('sin cierre, los resultados tampoco pueden preceder a la apertura', () => {
    expect(
      validateScheduleDays({ opensDay: '2026-06-15', resultsDay: '2026-06-10' })
    ).toBe('errorResultsBeforeClose');
  });
});
