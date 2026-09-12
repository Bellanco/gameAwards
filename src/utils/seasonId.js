/**
 * Identidad de una edición: identificador y nombre.
 *
 * Hasta ahora una edición ERA un año: el archivo se guardaba en `results/{año}`
 * y no cabían dos ediciones en el mismo año. Ahora cada edición tiene su propio
 * identificador (`2026`, `2026-verano`…) y un nombre para mostrar
 * («The Game Awards 2026»), y el año se queda como un dato más.
 *
 * Todo tolera lo antiguo: una edición archivada sin identificador ni nombre usa
 * su año para las dos cosas, así que el histórico existente se sigue leyendo sin
 * migrar nada.
 */

/** Longitud máxima del identificador (es el id de un documento de Firestore). */
export const MAX_SEASON_ID_LENGTH = 40;

/**
 * Convierte un texto en un identificador usable como id de documento.
 *
 * Firestore rechaza `/` en un id y se lleva mal con espacios y acentos en las
 * URLs, así que se normaliza a minúsculas, sin diacríticos y con guiones.
 *
 * @param {string} texto
 * @returns {string} '' si no queda nada aprovechable
 */
export const toSeasonId = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita los diacríticos ya separados
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SEASON_ID_LENGTH)
    .replace(/-+$/g, '');

/**
 * Identificador de la edición en curso según `config/voting`.
 * Si no está fijado, se usa el año: es lo que hacían las ediciones anteriores.
 *
 * @param {Object} config - config/voting
 * @returns {string}
 */
export const getSeasonId = (config) =>
  toSeasonId(config?.seasonId) || String(config?.season || new Date().getFullYear());

/**
 * Nombre para mostrar de una edición (la activa o una archivada).
 * Sin nombre, cae al año, que es lo único que tenían las ediciones antiguas.
 *
 * @param {Object} edicion - config/voting o un documento de results
 * @returns {string}
 */
export const getSeasonLabel = (edicion) => {
  const nombre = (edicion?.name || edicion?.seasonName || '').trim();
  if (nombre) return nombre;
  return String(edicion?.season || edicion?.seasonId || edicion?.id || '');
};
