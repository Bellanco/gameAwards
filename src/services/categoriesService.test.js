import { saveCategory, deleteCategory, reorderCategories } from './categoriesService';

const calls = { setDoc: [], deleteDoc: [], batchUpdates: [], commits: 0 };

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  getDocs: async () => ({ docs: [] }),
  doc: (_db, collectionName, id) => ({ path: `${collectionName}/${id}`, id }),
  setDoc: async (ref, data, options) => {
    calls.setDoc.push({ path: ref.path, id: ref.id, data, options });
  },
  deleteDoc: async (ref) => {
    calls.deleteDoc.push(ref.path);
  },
  writeBatch: () => ({
    update: (ref, data) => calls.batchUpdates.push({ path: ref.path, data }),
    commit: async () => {
      calls.commits += 1;
    },
  }),
}));

vi.mock('./errorService', () => ({
  logError: vi.fn(),
  ERROR_TYPES: { FIRESTORE_ERROR: 'FIRESTORE_ERROR' },
}));

vi.mock('./loggerService', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), critical: vi.fn() },
}));

beforeEach(() => {
  calls.setDoc = [];
  calls.deleteDoc = [];
  calls.batchUpdates = [];
  calls.commits = 0;
});

describe('saveCategory', () => {
  const options = [
    { id: 'cat_option_0', value: 'Elden Ring' },
    { id: null, value: '  Hades II  ' },
  ];

  it('crea una categoría con orderIndex, createdAt e isActive', async () => {
    const { docId, isNew } = await saveCategory({
      docId: null,
      titleEs: 'Juego del Año',
      titleEn: 'Game of the Year',
      options,
      weight: 2,
      orderIndex: 5,
    });

    expect(isNew).toBe(true);
    expect(docId).toEqual(expect.any(String));

    const { data, options: opts } = calls.setDoc[0];
    expect(data.orderIndex).toBe(5);
    expect(data.isActive).toBe(true);
    expect(data.createdAt).toEqual(expect.any(String));
    expect(opts).toEqual({ merge: true });
  });

  it('al EDITAR no toca orderIndex, createdAt ni isActive', async () => {
    // Con merge:false se borraban y la categoría perdía su posición en el orden.
    await saveCategory({
      docId: 'existente',
      titleEs: 'Juego del Año',
      titleEn: '',
      options,
      weight: 1,
    });

    const { data, path } = calls.setDoc[0];
    expect(path).toBe('categories/existente');
    expect(data).not.toHaveProperty('orderIndex');
    expect(data).not.toHaveProperty('createdAt');
    expect(data).not.toHaveProperty('isActive');
    expect(data.updatedAt).toEqual(expect.any(String));
  });

  it('usa el título español cuando el inglés va vacío', async () => {
    await saveCategory({
      docId: 'c1',
      titleEs: '  Juego del Año  ',
      titleEn: '   ',
      options,
      weight: 1,
    });

    expect(calls.setDoc[0].data.title).toEqual({
      es: 'Juego del Año',
      en: 'Juego del Año',
    });
  });

  it('conserva los ids existentes y da uno único a los nuevos', async () => {
    await saveCategory({
      docId: 'cat',
      titleEs: 'T',
      titleEn: 'T',
      options,
      weight: 1,
    });

    const saved = calls.setDoc[0].data.options;
    expect(saved[0]).toEqual({ id: 'cat_option_0', name: 'Elden Ring' });
    expect(saved[1].name).toBe('Hades II'); // recortado
    expect(saved[1].id).not.toBe('cat_option_0');
    expect(new Set(saved.map((o) => o.id)).size).toBe(2);
  });

  it('mantiene optionIds como espejo plano de options', async () => {
    await saveCategory({
      docId: 'cat',
      titleEs: 'T',
      titleEn: 'T',
      options,
      weight: 1,
    });

    const { options: saved, optionIds } = calls.setDoc[0].data;
    expect(optionIds).toEqual(saved.map((o) => o.id));
  });
});

describe('deleteCategory', () => {
  it('borra el documento cuando NO es la última', async () => {
    const result = await deleteCategory('c1', false);

    expect(result).toEqual({ kept: false });
    expect(calls.deleteDoc).toEqual(['categories/c1']);
    expect(calls.setDoc).toHaveLength(0);
  });

  it('conserva la última como placeholder en vez de borrarla', async () => {
    // Una colección sin documentos deja de existir en Firestore, y con ella se
    // pierde la referencia de la colección `categories`.
    const result = await deleteCategory('ultima', true);

    expect(result).toEqual({ kept: true });
    expect(calls.deleteDoc).toHaveLength(0);
    expect(calls.setDoc[0].data).toMatchObject({
      isPlaceholder: true,
      title: { es: '', en: '' },
      options: [],
      optionIds: [],
    });
  });
});

describe('reorderCategories', () => {
  it('reasigna orderIndex contiguo desde 0 en un único lote', async () => {
    const result = await reorderCategories([
      { docId: 'b' },
      { docId: 'c' },
      { docId: 'a' },
    ]);

    expect(result).toEqual({ reordered: 3 });
    expect(calls.commits).toBe(1);
    expect(calls.batchUpdates.map((u) => [u.path, u.data.orderIndex])).toEqual([
      ['categories/b', 0],
      ['categories/c', 1],
      ['categories/a', 2],
    ]);
  });
});
