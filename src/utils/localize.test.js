/**
 * Tests de los helpers de localización (datos bilingües de Firestore).
 * describe/it/expect son globales (vite.config.js -> test.globals).
 */
import {
  tField,
  getCategoryTitle,
  hasTitle,
  getOptionId,
  getOptionById,
  getOptionLabel,
  resolveOptionId,
} from './localize';

const category = {
  id: 'cat1',
  title: { es: 'Juego del Año', en: 'Game of the Year' },
  options: [
    { id: 'cat1_option_0', es: 'Juego A', en: 'Game A' },
    { id: 'cat1_option_1', es: 'Juego B', en: 'Game B' },
  ],
};

// Categoría con el nuevo modelo de opciones { id, name } (nombre único).
const categoryNameModel = {
  id: 'cat2',
  title: { es: 'Mejor Banda Sonora', en: 'Best Score' },
  options: [
    { id: 'cat2_option_0', name: 'Hades' },
    { id: 'cat2_option_1', name: 'Hi-Fi Rush' },
  ],
};

describe('tField', () => {
  it('devuelve el idioma pedido', () => {
    expect(tField({ es: 'Hola', en: 'Hi' }, 'en')).toBe('Hi');
    expect(tField({ es: 'Hola', en: 'Hi' }, 'es')).toBe('Hola');
  });
  it('hace fallback es -> en y tolera string legacy', () => {
    expect(tField({ es: 'Solo ES' }, 'en')).toBe('Solo ES');
    expect(tField('texto plano')).toBe('texto plano');
  });
  it('devuelve cadena vacía si es null/undefined', () => {
    expect(tField(null)).toBe('');
    expect(tField(undefined)).toBe('');
  });
  it('localiza opciones de nombre único { name }', () => {
    expect(tField({ id: 'x', name: 'Hades' }, 'en')).toBe('Hades');
    expect(tField({ id: 'x', name: 'Hades' }, 'es')).toBe('Hades');
  });
});

describe('getCategoryTitle', () => {
  it('localiza el título', () => {
    expect(getCategoryTitle(category, 'en')).toBe('Game of the Year');
    expect(getCategoryTitle(category, 'es')).toBe('Juego del Año');
  });
});

describe('hasTitle', () => {
  it('true si hay título en algún idioma', () => {
    expect(hasTitle(category)).toBe(true);
    expect(hasTitle({ title: { es: '', en: 'X' } })).toBe(true);
    expect(hasTitle({ title: 'legacy' })).toBe(true);
  });
  it('false si está vacío o ausente', () => {
    expect(hasTitle({ title: { es: '', en: '' } })).toBe(false);
    expect(hasTitle({ title: '   ' })).toBe(false);
    expect(hasTitle({})).toBe(false);
    expect(hasTitle(null)).toBe(false);
  });
});

describe('getOptionId', () => {
  it('usa el id del objeto si existe', () => {
    expect(getOptionId({ id: 'x' }, 'cat1', 0)).toBe('x');
  });
  it('genera id a partir de categoría + índice para legacy', () => {
    expect(getOptionId('Juego', 'cat1', 2)).toBe('cat1_option_2');
  });
});

describe('getOptionById', () => {
  it('encuentra la opción por su id', () => {
    expect(getOptionById(category, 'cat1_option_1').en).toBe('Game B');
  });
  it('devuelve undefined si no existe', () => {
    expect(getOptionById(category, 'nope')).toBeUndefined();
  });
});

describe('getOptionLabel', () => {
  it('localiza por optionId', () => {
    expect(getOptionLabel(category, 'cat1_option_0', 'en')).toBe('Game A');
  });
  it('resuelve un nombre legacy a su etiqueta', () => {
    expect(getOptionLabel(category, 'Juego A', 'en')).toBe('Game A');
  });
  it('devuelve el propio valor si no se encuentra', () => {
    expect(getOptionLabel(category, 'desconocido', 'es')).toBe('desconocido');
  });
  it('localiza opciones de nombre único { id, name }', () => {
    expect(getOptionLabel(categoryNameModel, 'cat2_option_0', 'en')).toBe('Hades');
    expect(getOptionLabel(categoryNameModel, 'cat2_option_1', 'es')).toBe('Hi-Fi Rush');
  });
});

describe('resolveOptionId', () => {
  it('mantiene un optionId válido', () => {
    expect(resolveOptionId(category, 'cat1_option_0')).toBe('cat1_option_0');
  });
  it('convierte un nombre legacy en optionId', () => {
    expect(resolveOptionId(category, 'Juego B')).toBe('cat1_option_1');
  });
  it('devuelve el valor original si no se puede resolver', () => {
    expect(resolveOptionId(category, 'otro')).toBe('otro');
    expect(resolveOptionId(category, '')).toBe('');
  });
  it('resuelve un nombre único { name } a su optionId', () => {
    expect(resolveOptionId(categoryNameModel, 'cat2_option_1')).toBe('cat2_option_1');
    expect(resolveOptionId(categoryNameModel, 'Hades')).toBe('cat2_option_0');
  });
});
