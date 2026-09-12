import { saveWinners } from './winnersService';

// Se captura lo que se manda al lote para poder afirmar sobre ello.
const batchState = { updates: [], commits: 0 };

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: (_db, collection, id) => ({ path: `${collection}/${id}` }),
  writeBatch: () => ({
    update: (ref, data) => batchState.updates.push({ path: ref.path, data }),
    commit: async () => {
      batchState.commits += 1;
    },
  }),
}));

vi.mock('./errorService', () => ({
  logError: vi.fn(),
  ERROR_TYPES: { FIRESTORE_ERROR: 'FIRESTORE_ERROR' },
}));

const category = (id, hasOptions = true) => ({
  id,
  options: hasOptions ? [{ id: `${id}_option_0`, name: 'A' }] : [],
});

beforeEach(() => {
  batchState.updates = [];
  batchState.commits = 0;
});

describe('saveWinners', () => {
  it('escribe TODAS las categorías en un único lote', () => {
    // Antes era un updateDoc por categoría dentro de un bucle: N viajes al
    // servidor y ganadores a medias si fallaba en mitad.
    return saveWinners([category('c1'), category('c2'), category('c3')], {
      c1: 'c1_option_0',
    }).then((result) => {
      expect(result.saved).toBe(3);
      expect(batchState.commits).toBe(1);
      expect(batchState.updates).toHaveLength(3);
    });
  });

  it('guarda el optionId ganador y null en las demás', async () => {
    await saveWinners([category('c1'), category('c2')], { c1: 'c1_option_0' });

    const byPath = Object.fromEntries(
      batchState.updates.map((u) => [u.path, u.data])
    );
    expect(byPath['categories/c1'].winner).toBe('c1_option_0');
    // Las categorías sin ganador se limpian explícitamente: si no, al
    // deseleccionar uno se quedaría el anterior guardado.
    expect(byPath['categories/c2'].winner).toBeNull();
  });

  it('sella la fecha de selección', async () => {
    await saveWinners([category('c1')], { c1: 'c1_option_0' });

    expect(batchState.updates[0].data.winnerSelectedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(batchState.updates[0].data.winnerSelectedAt))).toBe(false);
  });

  it('omite las categorías sin nominados (no pueden tener ganador)', async () => {
    const result = await saveWinners(
      [category('c1'), category('vacia', false)],
      {}
    );

    expect(result).toEqual({ saved: 1, skipped: 1 });
    expect(batchState.updates.map((u) => u.path)).toEqual(['categories/c1']);
  });

  it('no envía ningún lote si no hay nada que escribir', async () => {
    const result = await saveWinners([], {});

    expect(result.saved).toBe(0);
    expect(batchState.commits).toBe(0);
  });

  it('tolera categorías nulas y un mapa de ganadores ausente', async () => {
    await expect(saveWinners(null, undefined)).resolves.toEqual({
      saved: 0,
      skipped: 0,
    });
  });
});
