import { saveWinners, fetchWinners, clearWinners, clearLegacyWinnerField } from './winnersService';

// Se captura lo que se manda a Firestore para poder afirmar sobre ello.
const state = { sets: [], updates: [], commits: 0, deletes: [], stored: null };

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: (_db, collection, id) => ({ path: `${collection}/${id}` }),
  getDoc: async (ref) => ({
    exists: () => state.stored !== null,
    data: () => state.stored,
    ref,
  }),
  setDoc: async (ref, data) => {
    state.sets.push({ path: ref.path, data });
    state.stored = data;
  },
  deleteDoc: async (ref) => {
    state.deletes.push(ref.path);
    state.stored = null;
  },
  deleteField: () => '__deleted__',
  writeBatch: () => ({
    update: (ref, data) => state.updates.push({ path: ref.path, data }),
    commit: async () => {
      state.commits += 1;
    },
  }),
}));

vi.mock('./errorService', () => ({
  logError: vi.fn(),
  ERROR_TYPES: { FIRESTORE_ERROR: 'FIRESTORE_ERROR' },
}));

const category = (id, extra = {}) => ({
  id,
  options: [{ id: `${id}_option_0`, name: 'A' }],
  ...extra,
});

beforeEach(() => {
  state.sets = [];
  state.updates = [];
  state.deletes = [];
  state.commits = 0;
  state.stored = null;
});

describe('saveWinners', () => {
  it('escribe los ganadores en admin/winners, no en categories', async () => {
    // El motivo del cambio: `categories` es de lectura pública, así que un
    // `winner` guardado ahí es un ganador consultable por cualquiera antes de
    // anunciarlo.
    const result = await saveWinners([category('c1'), category('c2')], {
      c1: 'c1_option_0',
    });

    expect(state.sets).toHaveLength(1);
    expect(state.sets[0].path).toBe('admin/winners');
    expect(state.sets[0].data.winners).toEqual({ c1: 'c1_option_0' });
    expect(result.saved).toBe(1);
    expect(state.updates.filter((u) => u.path.startsWith('categories/'))).toHaveLength(0);
  });

  it('omite las categorías sin nominados', async () => {
    const sinOpciones = { id: 'c3', options: [] };
    const result = await saveWinners([category('c1'), sinOpciones], { c1: 'c1_option_0' });

    expect(result.skipped).toBe(1);
    expect(state.sets[0].data.winners).not.toHaveProperty('c3');
  });

  it('no guarda las categorías que quedaron sin ganador', async () => {
    await saveWinners([category('c1'), category('c2')], { c1: 'c1_option_0', c2: null });
    expect(state.sets[0].data.winners).toEqual({ c1: 'c1_option_0' });
  });

  it('MIGRA: borra el campo winner de las categorías que aún lo tengan', async () => {
    const result = await saveWinners(
      [category('c1', { winner: 'c1_option_0' }), category('c2')],
      { c1: 'c1_option_0' }
    );

    expect(result.migrated).toBe(1);
    const limpieza = state.updates.find((u) => u.path === 'categories/c1');
    expect(limpieza.data.winner).toBe('__deleted__');
    expect(limpieza.data.winnerSelectedAt).toBe('__deleted__');
  });

  it('no escribe nada en categories si ya están migradas', async () => {
    const result = await saveWinners([category('c1')], { c1: 'c1_option_0' });
    expect(result.migrated).toBe(0);
    expect(state.commits).toBe(0);
  });
});

describe('fetchWinners', () => {
  it('lee el documento admin/winners cuando existe', async () => {
    state.stored = { winners: { c1: 'c1_option_0' }, updatedAt: 'x' };
    await expect(fetchWinners([category('c1')])).resolves.toEqual({ c1: 'c1_option_0' });
  });

  it('cae al campo winner de las categorías si el documento no existe (legacy)', async () => {
    await expect(
      fetchWinners([category('c1', { winner: 'c1_option_0' }), category('c2')])
    ).resolves.toEqual({ c1: 'c1_option_0' });
  });

  it('devuelve un mapa vacío si no hay ni documento ni datos antiguos', async () => {
    await expect(fetchWinners([category('c1')])).resolves.toEqual({});
  });
});

describe('clearWinners', () => {
  it('borra el documento de ganadores (reinicio anual)', async () => {
    await clearWinners();
    expect(state.deletes).toEqual(['admin/winners']);
  });
});

describe('clearLegacyWinnerField', () => {
  it('es idempotente: sin datos antiguos no escribe', async () => {
    await expect(clearLegacyWinnerField([category('c1')])).resolves.toBe(0);
    expect(state.commits).toBe(0);
  });
});
