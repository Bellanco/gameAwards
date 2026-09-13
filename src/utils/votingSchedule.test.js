import {
  isVotingOpenNow,
  getVotingState,
  getSeasonStage,
  areResultsPublished,
  daysUntil,
  validateClosingDay,
  VOTING_STATE,
  SEASON_STAGE,
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
  // Ya no depende de una fecha: publicar es archivar la edición, y eso deja su
  // id en `lastPublishedId`.
  it('no hay nada publicado sin un archivo al que apuntar', () => {
    expect(areResultsPublished(config())).toBe(false);
    expect(areResultsPublished(config({ lastPublishedId: '' }))).toBe(false);
    expect(areResultsPublished(null)).toBe(false);
  });

  it('se publican cuando hay un archivo publicado', () => {
    expect(areResultsPublished(config({ lastPublishedId: 'porra-2026' }))).toBe(true);
  });

  it('una fecha de resultados heredada ya no publica nada por sí sola', () => {
    // Las ediciones creadas con el modelo de tres fechas conservan `resultsAt`;
    // no debe resucitar como criterio de publicación.
    expect(areResultsPublished(config({ resultsAtMillis: NOW - DAY }))).toBe(false);
  });
});

describe('getSeasonStage', () => {
  it('sin fecha de cierre no hay edición en marcha', () => {
    expect(getSeasonStage(config(), NOW)).toBe(SEASON_STAGE.NONE);
  });

  it('con la votación en curso, la edición está abierta', () => {
    expect(getSeasonStage(config({ closesAtMillis: NOW + DAY }), NOW)).toBe(SEASON_STAGE.OPEN);
  });

  it('pasada la fecha de cierre, queda pendiente de publicar', () => {
    expect(getSeasonStage(config({ closesAtMillis: NOW - DAY }), NOW)).toBe(SEASON_STAGE.PENDING);
  });

  it('un cierre forzado también la deja pendiente de publicar', () => {
    expect(
      getSeasonStage(config({ closesAtMillis: NOW + DAY, isOpen: false }), NOW)
    ).toBe(SEASON_STAGE.PENDING);
  });

  it('publicar devuelve el ciclo al principio', () => {
    // Archivar borra la fecha de cierre y apunta el archivo publicado.
    const publicada = config({ closesAtMillis: null, isOpen: false, lastPublishedId: 'porra-2026' });
    expect(getSeasonStage(publicada, NOW)).toBe(SEASON_STAGE.NONE);
  });
});

describe('daysUntil', () => {
  it('devuelve null sin fecha y nunca negativo', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil(NOW - 5 * DAY, NOW)).toBe(0);
    expect(daysUntil(NOW + 7 * DAY, NOW)).toBe(7);
  });
});

describe('validateClosingDay', () => {
  const HOY = '2026-06-15';

  it('exige una fecha', () => {
    expect(validateClosingDay('', HOY)).toBe('errorClosingDayRequired');
    expect(validateClosingDay(null, HOY)).toBe('errorClosingDayRequired');
  });

  it('rechaza un cierre en el pasado', () => {
    // Una edición que nace cerrada no sirve de nada: aparecería directamente
    // como «pendiente de publicar».
    expect(validateClosingDay('2026-06-14', HOY)).toBe('errorClosingDayInThePast');
  });

  it('acepta hoy y cualquier día futuro', () => {
    expect(validateClosingDay(HOY, HOY)).toBeNull();
    expect(validateClosingDay('2026-12-31', HOY)).toBeNull();
  });
});
