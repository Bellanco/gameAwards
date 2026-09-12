import { MAX_BALLOT_EDITS, getRemainingEdits, canEditBallot } from './ballotEdits';

const NOW = Date.parse('2026-06-15T12:00:00.000Z');
const DAY = 24 * 3600_000;

const openConfig = {
  isOpen: true,
  opensAtMillis: NOW - DAY,
  closesAtMillis: NOW + DAY,
  resultsAtMillis: null,
};

describe('getRemainingEdits', () => {
  it('descuenta las ediciones ya usadas', () => {
    expect(getRemainingEdits({ editCount: 0 })).toBe(MAX_BALLOT_EDITS);
    expect(getRemainingEdits({ editCount: 2 })).toBe(MAX_BALLOT_EDITS - 2);
    expect(getRemainingEdits({ editCount: MAX_BALLOT_EDITS })).toBe(0);
  });

  it('nunca devuelve un número negativo', () => {
    expect(getRemainingEdits({ editCount: MAX_BALLOT_EDITS + 3 })).toBe(0);
  });

  it('trata un ballot antiguo sin contador como recién enviado', () => {
    // Los votos emitidos antes de existir `editCount` no deben quedarse sin
    // derecho a corrección.
    expect(getRemainingEdits({})).toBe(MAX_BALLOT_EDITS);
  });
});

describe('canEditBallot', () => {
  it('permite editar con cambios disponibles y votación abierta', () => {
    expect(canEditBallot({ editCount: 1 }, openConfig, NOW)).toBe(true);
  });

  it('no permite editar sin ballot previo', () => {
    expect(canEditBallot(null, openConfig, NOW)).toBe(false);
  });

  it('no permite editar agotado el cupo', () => {
    expect(canEditBallot({ editCount: MAX_BALLOT_EDITS }, openConfig, NOW)).toBe(false);
  });

  it('no permite editar fuera de plazo aunque queden cambios', () => {
    // Las reglas rechazan igualmente el update pasada la fecha de cierre: la UI
    // no debe ofrecer un botón que va a fallar.
    const closed = { ...openConfig, closesAtMillis: NOW - 1 };
    expect(canEditBallot({ editCount: 0 }, closed, NOW)).toBe(false);
  });

  it('no permite editar si el admin fuerza el cierre', () => {
    expect(canEditBallot({ editCount: 0 }, { ...openConfig, isOpen: false }, NOW)).toBe(false);
  });
});
