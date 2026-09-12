import { hashUid, isOwnEntry } from './pseudonym';

describe('hashUid', () => {
  it('es estable: el mismo UID da siempre la misma huella', () => {
    expect(hashUid('abc123')).toBe(hashUid('abc123'));
  });

  it('distingue UIDs distintos', () => {
    expect(hashUid('usuario-1')).not.toBe(hashUid('usuario-2'));
  });

  it('devuelve 16 caracteres hexadecimales', () => {
    expect(hashUid('4kZq8vN2pLxT1aB7cD9eF0gH')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('no filtra el UID original', () => {
    const uid = 'uid-secreto-de-firebase';
    expect(hashUid(uid)).not.toContain('uid');
  });

  it('devuelve cadena vacía sin UID', () => {
    expect(hashUid(null)).toBe('');
    expect(hashUid(undefined)).toBe('');
    expect(hashUid('')).toBe('');
  });
});

describe('isOwnEntry', () => {
  it('reconoce la fila propia por la huella', () => {
    const entry = { rank: 1, uidHash: hashUid('yo'), nickname: 'Yo', points: 3 };
    expect(isOwnEntry(entry, 'yo')).toBe(true);
    expect(isOwnEntry(entry, 'otra-persona')).toBe(false);
  });

  it('tolera los archivos antiguos, que guardaban el UID en claro', () => {
    const legacy = { rank: 1, userId: 'yo', nickname: 'Yo', points: 3 };
    expect(isOwnEntry(legacy, 'yo')).toBe(true);
    expect(isOwnEntry(legacy, 'otra-persona')).toBe(false);
  });

  it('sin sesión no resalta ninguna fila', () => {
    expect(isOwnEntry({ uidHash: hashUid('yo') }, null)).toBe(false);
  });
});
