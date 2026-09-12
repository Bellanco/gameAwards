/**
 * Tabla de rutas de la app: FUENTE ÚNICA para resolver qué pantalla se pinta.
 *
 * La app no usa router: la navegación entre categorías es estado de React. Lo
 * único que depende de la URL es el panel oculto de administración, así que
 * aquí solo hay dos rutas declaradas y un catch-all.
 *
 * Cualquier ruta NO declarada rebota a la principal (ver `App.jsx`), igual que
 * el `<Route path="*" element={<Navigate to={FALLBACK_ROUTE} replace />} />`
 * del proyecto GL. Para que el navegador llegue siquiera a React en una carga
 * directa hace falta además `public/_redirects` (`/* /index.html 200`); sin él
 * CloudFlare Pages devuelve un 404 estático y nada de esto se ejecuta.
 */

/** Rutas declaradas. */
export const ROUTES = {
  home: '/',
  admin: '/admin',
};

/** Ruta a la que rebota cualquier cosa no declarada. */
export const FALLBACK_ROUTE = ROUTES.home;

/**
 * Normaliza un pathname para compararlo: sin barra final (salvo la raíz), sin
 * mayúsculas y sin espacios. Así `/Admin/` y `/admin` son la misma ruta.
 * @param {string} pathname
 * @returns {string}
 */
export const normalizePathname = (pathname) => {
  const trimmed = (pathname || '/').trim().toLowerCase();
  const withoutTrailing = trimmed.replace(/\/+$/, '');
  return withoutTrailing || '/';
};

/**
 * Resuelve el nombre de la ruta a partir del pathname.
 * @param {string} pathname
 * @returns {'home'|'admin'|null} null si la ruta no está declarada
 */
export const resolveRoute = (pathname) => {
  const normalized = normalizePathname(pathname);
  const match = Object.entries(ROUTES).find(([, path]) => path === normalized);
  return match ? match[0] : null;
};

/**
 * ¿El pathname corresponde a una ruta declarada?
 * @param {string} pathname
 * @returns {boolean}
 */
export const isKnownRoute = (pathname) => resolveRoute(pathname) !== null;
