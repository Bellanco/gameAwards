import { buildBallot } from './ballotService';

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), setDoc: vi.fn(), getDoc: vi.fn() }));
vi.mock('./errorService', () => ({
  logError: vi.fn(),
  ERROR_TYPES: { FIRESTORE_ERROR: 'FIRESTORE_ERROR' },
}));

const currentUser = {
  uid: 'uid-1',
  email: 'votante@example.com',
  displayName: 'Diego',
};

const userVotes = {
  cat1: { id: 'cat1_option_0', name: 'Elden Ring' },
  cat2: { id: 'cat2_option_3', name: 'Hades II' },
};

describe('buildBallot', () => {
  it('guarda las selecciones por optionId, no por nombre', () => {
    // Es lo que hace el voto independiente del idioma y resistente a que el
    // administrador corrija el texto de un nominado.
    const ballot = buildBallot({ currentUser, userVotes, displayName: 'Diego', season: 2026 });

    expect(ballot.selections).toEqual({
      cat1: 'cat1_option_0',
      cat2: 'cat2_option_3',
    });
  });

  it('toma uid y correo del usuario autenticado', () => {
    // Las reglas exigen userEmail == request.auth.token.email.
    const ballot = buildBallot({ currentUser, userVotes, displayName: 'Diego', season: 2026 });

    expect(ballot.userId).toBe('uid-1');
    expect(ballot.userEmail).toBe('votante@example.com');
  });

  it('usa el nombre de Google como userNickname', () => {
    const ballot = buildBallot({ currentUser, userVotes, displayName: 'Otro', season: 2026 });

    expect(ballot.userNickname).toBe('Diego');
    expect(ballot.userDisplayName).toBe('Otro');
  });

  it('cae al nombre visible si la cuenta de Google no tiene displayName', () => {
    const ballot = buildBallot({
      currentUser: { ...currentUser, displayName: null },
      userVotes,
      displayName: 'Anónimo',
      season: 2026,
    });

    expect(ballot.userNickname).toBe('Anónimo');
  });

  it('envía la temporada como entero (las reglas exigen int)', () => {
    const ballot = buildBallot({ currentUser, userVotes, displayName: 'D', season: 2026.9 });

    expect(ballot.season).toBe(2026);
    expect(Number.isInteger(ballot.season)).toBe(true);
  });

  it('cumple exactamente el esquema que validan las reglas', () => {
    const ballot = buildBallot({ currentUser, userVotes, displayName: 'D', season: 2026 });

    // hasOnly + hasAll en firestore.rules: ni un campo de más ni de menos.
    expect(Object.keys(ballot).sort()).toEqual(
      [
        'isActive',
        'season',
        'selections',
        'submittedAt',
        'updatedAt',
        'editCount',
        'userDisplayName',
        'userEmail',
        'userId',
        'userNickname',
      ].sort()
    );
    expect(ballot.isActive).toBe(true);
    expect(Number.isNaN(Date.parse(ballot.submittedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(ballot.updatedAt))).toBe(false);
  });

  it('el envío inicial arranca el contador de ediciones a cero', () => {
    // Las reglas exigen editCount == 0 en el `create`.
    const ballot = buildBallot({ currentUser, userVotes, displayName: 'D', season: 2026 });

    expect(ballot.editCount).toBe(0);
    expect(ballot.updatedAt).toBe(ballot.submittedAt);
  });
});

describe('buildBallot al modificar un voto ya emitido', () => {
  const existingBallot = {
    submittedAt: '2026-06-01T10:00:00.000Z',
    editCount: 2,
  };

  it('avanza el contador de uno en uno', () => {
    // Es exactamente lo que comprueban las reglas: prev + 1, nunca un salto.
    const ballot = buildBallot({
      currentUser,
      userVotes,
      displayName: 'D',
      season: 2026,
      existingBallot,
    });

    expect(ballot.editCount).toBe(3);
  });

  it('conserva la fecha del primer envío y sella la de la modificación', () => {
    // `submittedAt` es inmutable en las reglas: cambiarlo tumbaría la edición.
    const ballot = buildBallot({
      currentUser,
      userVotes,
      displayName: 'D',
      season: 2026,
      existingBallot,
    });

    expect(ballot.submittedAt).toBe(existingBallot.submittedAt);
    expect(ballot.updatedAt).not.toBe(existingBallot.submittedAt);
    expect(Number.isNaN(Date.parse(ballot.updatedAt))).toBe(false);
  });

  it('trata un voto antiguo sin contador como si tuviera cero ediciones', () => {
    const ballot = buildBallot({
      currentUser,
      userVotes,
      displayName: 'D',
      season: 2026,
      existingBallot: { submittedAt: '2026-06-01T10:00:00.000Z' },
    });

    expect(ballot.editCount).toBe(1);
  });
});
