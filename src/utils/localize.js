/**
 * Helpers de localización para datos de Firestore (categorías y opciones).
 *
 * Modelo de datos bilingüe:
 *   category.title   = { es: "...", en: "..." }
 *   category.options = [ { id: "<docId>_option_0", es: "...", en: "..." }, ... ]
 *
 * Estos helpers toleran también el formato antiguo (string) por seguridad,
 * de modo que un dato a medio migrar nunca rompe el render.
 */

/**
 * Devuelve el texto en el idioma pedido a partir de un campo que puede ser
 * un objeto { es, en } o un string plano (legacy).
 * @param {{es?: string, en?: string}|string|null|undefined} field
 * @param {string} language - 'es' | 'en'
 * @returns {string}
 */
export const tField = (field, language = 'es') => {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[language] || field.es || field.en || '';
};

/**
 * Título localizado de una categoría.
 * @param {Object} category
 * @param {string} language
 * @returns {string}
 */
export const getCategoryTitle = (category, language = 'es') =>
  tField(category?.title, language);

/**
 * Indica si una categoría tiene un título no vacío en algún idioma.
 * Reemplaza el viejo `category.title && category.title.trim()`.
 * @param {Object} category
 * @returns {boolean}
 */
export const hasTitle = (category) => {
  const title = category?.title;
  if (!title) return false;
  if (typeof title === 'string') return title.trim().length > 0;
  return Boolean((title.es && title.es.trim()) || (title.en && title.en.trim()));
};

/**
 * Devuelve el id estable de una opción (objeto {id,...} o string legacy).
 * @param {{id?: string}|string} option
 * @param {string} categoryId
 * @param {number} index
 * @returns {string}
 */
export const getOptionId = (option, categoryId, index) => {
  if (option && typeof option === 'object' && option.id) return option.id;
  return `${categoryId}_option_${index}`;
};

/**
 * Busca una opción por su id dentro de una categoría.
 * @param {Object} category
 * @param {string} optionId
 * @returns {Object|undefined}
 */
export const getOptionById = (category, optionId) =>
  (category?.options || []).find(
    (opt, idx) => getOptionId(opt, category.id, idx) === optionId
  );

/**
 * Etiqueta localizada de una opción a partir de su id.
 * Tolera datos legacy: si `value` es un nombre (no un optionId), lo resuelve.
 * Si no se encuentra, devuelve el propio valor (mejor que romper la UI).
 * @param {Object} category
 * @param {string} value - optionId (nuevo) o nombre (legacy)
 * @param {string} language
 * @returns {string}
 */
export const getOptionLabel = (category, value, language = 'es') => {
  const opt = getOptionById(category, value) || getOptionByLabel(category, value);
  return opt ? tField(opt, language) : value;
};

/**
 * Busca una opción por su etiqueta (es/en o string legacy). Útil para resolver
 * valores guardados por nombre en datos antiguos.
 * @param {Object} category
 * @param {string} label
 * @returns {Object|undefined}
 */
export const getOptionByLabel = (category, label) =>
  (category?.options || []).find((opt) =>
    typeof opt === 'string'
      ? opt === label
      : opt.es === label || opt.en === label
  );

/**
 * Normaliza cualquier valor (optionId nuevo o nombre legacy) al optionId estable.
 * Si no se puede resolver, devuelve el valor original.
 * @param {Object} category
 * @param {string} value
 * @returns {string}
 */
export const resolveOptionId = (category, value) => {
  if (!value) return value;
  // ¿ya es un optionId válido?
  if (getOptionById(category, value)) return value;
  // ¿es un nombre? -> devolver el id de esa opción
  const opts = category?.options || [];
  const idx = opts.findIndex((opt) =>
    typeof opt === 'string' ? opt === value : opt.es === value || opt.en === value
  );
  if (idx >= 0) return getOptionId(opts[idx], category.id, idx);
  return value;
};
