import { sanitizeUserText, MAX_USER_TEXT_LENGTH } from './sanitize';

describe('sanitizeUserText', () => {
  it('recorta espacios al principio y al final', () => {
    expect(sanitizeUserText('  Diego  ')).toBe('Diego');
  });

  it('no supera el tope que exigen las reglas de Firestore', () => {
    const long = 'x'.repeat(120);
    expect(sanitizeUserText(long)).toHaveLength(MAX_USER_TEXT_LENGTH);
  });

  it('no deja espacios sueltos tras el recorte por longitud', () => {
    // Si el corte cae justo en un espacio, el resultado no debe acabar en blanco:
    // las reglas exigen longitud > 0 y un nombre con cola en blanco es feo.
    const value = `${'a'.repeat(MAX_USER_TEXT_LENGTH - 1)} palabra`;
    expect(sanitizeUserText(value)).toBe('a'.repeat(MAX_USER_TEXT_LENGTH - 1));
  });

  it('tolera null, undefined y cadena vacía', () => {
    expect(sanitizeUserText(null)).toBe('');
    expect(sanitizeUserText(undefined)).toBe('');
    expect(sanitizeUserText('')).toBe('');
  });

  it('puede dejar la cadena vacía, y por eso se valida DESPUÉS de sanear', () => {
    expect(sanitizeUserText('<>')).toBe('');
    expect(sanitizeUserText('   ')).toBe('');
  });
});
