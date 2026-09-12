import { ROUTES, FALLBACK_ROUTE, normalizePathname, resolveRoute, isKnownRoute } from './routes';

describe('routes', () => {
  describe('normalizePathname', () => {
    it('deja la raíz como está', () => {
      expect(normalizePathname('/')).toBe('/');
    });

    it('quita la barra final', () => {
      expect(normalizePathname('/admin/')).toBe('/admin');
      expect(normalizePathname('/admin///')).toBe('/admin');
    });

    it('pasa a minúsculas y recorta espacios', () => {
      expect(normalizePathname('  /Admin  ')).toBe('/admin');
    });

    it('trata un pathname vacío o nulo como raíz', () => {
      expect(normalizePathname('')).toBe('/');
      expect(normalizePathname(null)).toBe('/');
      expect(normalizePathname(undefined)).toBe('/');
    });
  });

  describe('resolveRoute', () => {
    it('resuelve la página principal', () => {
      expect(resolveRoute('/')).toBe('home');
    });

    it('resuelve /admin en todas sus variantes de escritura', () => {
      expect(resolveRoute('/admin')).toBe('admin');
      expect(resolveRoute('/admin/')).toBe('admin');
      expect(resolveRoute('/Admin')).toBe('admin');
    });

    it('devuelve null para rutas no declaradas', () => {
      expect(resolveRoute('/no-existe')).toBeNull();
      expect(resolveRoute('/admin/categorias')).toBeNull();
      expect(resolveRoute('/vote/3')).toBeNull();
    });
  });

  describe('isKnownRoute', () => {
    it('distingue rutas declaradas de las que no lo están', () => {
      expect(isKnownRoute('/')).toBe(true);
      expect(isKnownRoute('/admin')).toBe(true);
      expect(isKnownRoute('/cualquier-cosa')).toBe(false);
    });
  });

  it('el fallback es la página principal', () => {
    expect(FALLBACK_ROUTE).toBe(ROUTES.home);
  });
});
