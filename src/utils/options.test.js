import { buildStableOptions, generateUUID } from './options';

// Generador determinista para poder afirmar sobre los ids nuevos.
const fakeIds = () => {
  let n = 0;
  return () => `new${++n}`;
};

describe('buildStableOptions', () => {
  it('conserva el id de las opciones existentes', () => {
    const result = buildStableOptions(
      [
        { id: 'cat_option_0', value: 'Elden Ring' },
        { id: 'cat_option_1', value: 'God of War' },
      ],
      'cat',
      fakeIds()
    );

    expect(result).toEqual([
      { id: 'cat_option_0', name: 'Elden Ring' },
      { id: 'cat_option_1', name: 'God of War' },
    ]);
  });

  it('asigna un id nuevo a las opciones sin id', () => {
    const result = buildStableOptions(
      [{ id: null, value: 'Hades II' }],
      'cat',
      fakeIds()
    );

    expect(result).toEqual([{ id: 'cat_option_new1', name: 'Hades II' }]);
  });

  // Regresión del bug: al borrar la opción 0 y añadir otra, el id derivado del
  // índice (`${docId}_option_${idx}`) colisionaba con el de la superviviente.
  it('no colisiona al borrar una opción y añadir otra', () => {
    const result = buildStableOptions(
      [
        { id: 'cat_option_1', value: 'God of War' }, // superviviente
        { id: null, value: 'Hades II' }, // nueva, ocupa el índice 1
      ],
      'cat',
      fakeIds()
    );

    expect(result[0].id).toBe('cat_option_1');
    expect(result[1].id).not.toBe('cat_option_1');
    expect(new Set(result.map((o) => o.id)).size).toBe(2);
  });

  it('reasigna id a los duplicados que lleguen de datos antiguos', () => {
    const result = buildStableOptions(
      [
        { id: 'dup', value: 'A' },
        { id: 'dup', value: 'B' },
        { id: 'dup', value: 'C' },
      ],
      'cat',
      fakeIds()
    );

    expect(result[0].id).toBe('dup');
    expect(new Set(result.map((o) => o.id)).size).toBe(3);
  });

  it('recorta los nombres y tolera una lista vacía', () => {
    expect(buildStableOptions([{ id: 'x', value: '  Balatro  ' }], 'cat')).toEqual([
      { id: 'x', name: 'Balatro' },
    ]);
    expect(buildStableOptions([], 'cat')).toEqual([]);
    expect(buildStableOptions(null, 'cat')).toEqual([]);
  });
});

describe('generateUUID', () => {
  it('devuelve ids con formato UUID y distintos entre sí', () => {
    const a = generateUUID();
    const b = generateUUID();

    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(a).not.toBe(b);
  });
});
