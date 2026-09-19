import { openSeason, publishAndArchiveSeason, deleteSeasonResult } from './seasonService';

/**
 * Lo que se archiva tiene que salir de Firestore, no de quien llama.
 *
 * El bug: el AdminPanel carga `ballots` y `categories` UNA vez al montarse y se
 * los pasaba al servicio. Con la pestaña abierta desde la edición anterior,
 * publicar la siguiente archivaba la clasificación de la anterior —los mismos
 * votantes, las mismas opciones— aunque en la base de datos hubiera otra cosa.
 */

// Estado de la "base de datos" simulada y registro de lo que se le escribe.
const state = {
  ballots: [],
  categories: [],
  results: [],
  config: null,
  sets: [],
  updates: [],
  deletes: [],
  clearedWinners: 0,
};

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: (_db, collectionName, id) => ({ path: `${collectionName}/${id}`, id }),
  collection: (_db, name) => ({ name }),
  getDocs: async (ref) => ({
    docs: (state[ref.name] || []).map((entry) => ({
      id: entry.id,
      ref: { path: `${ref.name}/${entry.id}`, id: entry.id },
      data: () => entry.data,
    })),
  }),
  getDoc: async (ref) => ({
    exists: () => ref.path === 'config/voting' && state.config !== null,
    data: () => state.config,
    ref,
  }),
  setDoc: async (ref, data) => {
    state.sets.push({ path: ref.path, data });
    if (ref.path === 'config/voting') state.config = { ...(state.config || {}), ...data };
  },
  deleteDoc: async (ref) => {
    state.deletes.push(ref.path);
    const [collectionName, id] = ref.path.split('/');
    if (state[collectionName]) {
      state[collectionName] = state[collectionName].filter((entry) => entry.id !== id);
    }
  },
  updateDoc: async (ref, data) => {
    state.updates.push({ path: ref.path, data });
  },
  writeBatch: () => ({
    delete: (ref) => state.deletes.push(ref.path),
    update: (ref, data) => state.updates.push({ path: ref.path, data }),
    commit: async () => {},
  }),
  serverTimestamp: () => '__serverTimestamp__',
}));

// Los ganadores se prueban en winnersService.test.js; aquí solo importa que la
// publicación los pida y los retire.
vi.mock('./winnersService', () => ({
  fetchWinners: async () => ({ cat1: 'cat1_option_0' }),
  clearWinners: async () => {
    state.clearedWinners += 1;
  },
  clearLegacyWinnerField: async () => 0,
}));

vi.mock('./errorService', () => ({
  logError: vi.fn(),
  ERROR_TYPES: { FIRESTORE_ERROR: 'FIRESTORE_ERROR' },
}));

/** Categoría votable, tal y como vive en Firestore. */
const category = (id) => ({
  id,
  data: {
    title: { es: 'Juego del año', en: 'Game of the year' },
    options: [
      { id: `${id}_option_0`, name: 'Juego A' },
      { id: `${id}_option_1`, name: 'Juego B' },
    ],
    weight: 1,
    orderIndex: 0,
    isActive: true,
  },
});

/** Papeleta de un votante. */
const ballot = (uid, nickname, optionId) => ({
  id: uid,
  data: {
    userId: uid,
    userDisplayName: nickname,
    selections: { cat1: optionId },
    season: 2026,
    isActive: true,
  },
});

const lastResultsWrite = () => state.sets.filter((s) => s.path.startsWith('results/')).pop();

beforeEach(() => {
  state.ballots = [];
  state.categories = [];
  state.results = [];
  state.config = null;
  state.sets = [];
  state.updates = [];
  state.deletes = [];
  state.clearedWinners = 0;
});

describe('publishAndArchiveSeason', () => {
  it('archiva las papeletas que hay en Firestore al publicar', async () => {
    state.categories = [category('cat1')];
    state.ballots = [ballot('uid-1', 'Ana', 'cat1_option_0')];

    const result = await publishAndArchiveSeason({
      season: 2026,
      seasonId: 'nuevo-test',
      seasonName: 'Nuevo test',
    });

    const archived = lastResultsWrite();
    expect(archived.path).toBe('results/nuevo-test');
    expect(archived.data.totalBallots).toBe(1);
    expect(archived.data.leaderboard).toHaveLength(1);
    expect(archived.data.leaderboard[0].nickname).toBe('Ana');
    expect(result.totalBallots).toBe(1);
  });

  it('no arrastra la clasificación de la edición anterior', async () => {
    // Primera edición: dos votantes.
    state.categories = [category('cat1')];
    state.ballots = [
      ballot('uid-1', 'Ana', 'cat1_option_0'),
      ballot('uid-2', 'Bea', 'cat1_option_1'),
    ];
    await publishAndArchiveSeason({ season: 2026, seasonId: 'test', seasonName: 'Test' });
    expect(lastResultsWrite().data.totalBallots).toBe(2);

    // Publicar retira las papeletas: la edición siguiente empieza vacía y solo
    // vota una persona.
    state.ballots = [ballot('uid-3', 'Carlos', 'cat1_option_0')];

    await publishAndArchiveSeason({
      season: 2027,
      seasonId: 'nuevo-test',
      seasonName: 'Nuevo test',
    });

    const archived = lastResultsWrite();
    expect(archived.path).toBe('results/nuevo-test');
    expect(archived.data.totalBallots).toBe(1);
    expect(archived.data.leaderboard.map((e) => e.nickname)).toEqual(['Carlos']);
  });

  it('retira exactamente las papeletas que acaba de archivar', async () => {
    state.categories = [category('cat1')];
    state.ballots = [
      ballot('uid-1', 'Ana', 'cat1_option_0'),
      ballot('uid-2', 'Bea', 'cat1_option_1'),
    ];

    const result = await publishAndArchiveSeason({ season: 2026, seasonId: 'test' });

    expect(state.deletes).toEqual(['ballots/uid-1', 'ballots/uid-2']);
    expect(result.deleted).toBe(2);
    expect(lastResultsWrite().data.totalBallots).toBe(result.deleted);
  });

  it('publica la clasificación sin el UID de nadie', async () => {
    state.categories = [category('cat1')];
    state.ballots = [ballot('uid-1', 'Ana', 'cat1_option_0')];

    await publishAndArchiveSeason({ season: 2026, seasonId: 'test' });

    const [entry] = lastResultsWrite().data.leaderboard;
    expect(entry.userId).toBeUndefined();
    expect(entry.uidHash).toBeTruthy();
  });

  it('deja config/voting sin edición y apuntando al archivo publicado', async () => {
    state.categories = [category('cat1')];

    await publishAndArchiveSeason({ season: 2026, seasonId: 'test', seasonName: 'Test' });

    const config = state.sets.filter((s) => s.path === 'config/voting').pop();
    expect(config.data.closesAtMillis).toBeNull();
    expect(config.data.lastPublishedId).toBe('test');
    expect(config.data.season).toBe(2027);
  });
});

describe('openSeason', () => {
  it('retira las papeletas sueltas de una edición anterior', async () => {
    // Solo se abre una edición cuando no hay ninguna en marcha, así que lo que
    // quede aquí es un resto: contaminaría la nueva clasificación y sus dueños
    // no podrían votar por el bloqueo de re-voto.
    state.ballots = [ballot('uid-1', 'Ana', 'cat1_option_0')];

    const result = await openSeason({
      name: 'Porra de invierno',
      closesDay: '2026-12-31',
      season: 2026,
    });

    expect(result.leftovers).toBe(1);
    expect(state.deletes).toEqual(['ballots/uid-1']);
    expect(state.clearedWinners).toBe(1);
  });

  it('no toca nada si la mesa ya está limpia', async () => {
    const result = await openSeason({ name: 'Test', closesDay: '2026-12-31', season: 2026 });

    expect(result.leftovers).toBe(0);
    expect(state.deletes).toEqual([]);
    expect(state.clearedWinners).toBe(0);
  });

  it('abre con su par de fechas (ISO + epoch) y el id derivado del nombre', async () => {
    const result = await openSeason({
      name: 'Nuevo test',
      closesDay: '2026-12-31',
      season: 2026,
    });

    expect(result.seasonId).toBe('nuevo-test');
    const config = state.sets.filter((s) => s.path === 'config/voting').pop();
    expect(config.data.isOpen).toBe(true);
    expect(config.data.closesAt).toBeTruthy();
    expect(typeof config.data.closesAtMillis).toBe('number');
  });
});

describe('deleteSeasonResult', () => {
  /** Edición archivada, tal y como vive en `results`. */
  const archivo = (id, season) => ({ id, data: { season, name: id } });

  it('borra el archivo de la edición', async () => {
    state.results = [archivo('test', 2026)];
    state.config = { lastPublishedId: '' };

    const result = await deleteSeasonResult('test');

    expect(state.deletes).toEqual(['results/test']);
    expect(result.wasPublished).toBe(false);
  });

  it('reapunta la pantalla pública a la edición anterior si borra la publicada', async () => {
    // Sin esto, `lastPublishedId` seguiría nombrando un archivo que ya no
    // existe y los resultados públicos se quedarían pidiendo un hueco.
    state.results = [archivo('test', 2026), archivo('porra-2025', 2025)];
    state.config = { lastPublishedId: 'test' };

    const result = await deleteSeasonResult('test');

    expect(result.wasPublished).toBe(true);
    expect(result.lastPublishedId).toBe('porra-2025');
    const config = state.sets.filter((s) => s.path === 'config/voting').pop();
    expect(config.data.lastPublishedId).toBe('porra-2025');
  });

  it('deja la pantalla pública sin nada si era la única edición', async () => {
    state.results = [archivo('test', 2026)];
    state.config = { lastPublishedId: 'test' };

    const result = await deleteSeasonResult('test');

    expect(result.lastPublishedId).toBe('');
    const config = state.sets.filter((s) => s.path === 'config/voting').pop();
    expect(config.data.lastPublishedId).toBe('');
  });

  it('no toca config/voting si la edición borrada no era la publicada', async () => {
    state.results = [archivo('test', 2026), archivo('porra-2025', 2025)];
    state.config = { lastPublishedId: 'porra-2025' };

    await deleteSeasonResult('test');

    expect(state.sets.filter((s) => s.path === 'config/voting')).toHaveLength(0);
  });
});
