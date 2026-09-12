/**
 * Construcción de las opciones (nominados) de una categoría con ids estables.
 *
 * El `optionId` es la clave con la que se guardan los votos y los ganadores, así
 * que tiene dos obligaciones que conviven mal:
 *
 *  - ESTABLE: una opción que ya existía debe conservar su id al editar la
 *    categoría, o los votos ya emitidos dejarían de apuntar a ella.
 *  - ÚNICO: dos opciones de la misma categoría nunca pueden compartir id, o
 *    `getOptionById` devolvería siempre la primera y el recuento sería falso.
 *
 * Antes el id de una opción nueva se derivaba de su POSICIÓN
 * (`${docId}_option_${idx}`), que rompe la segunda: al borrar la opción 0 y
 * añadir otra, la nueva recibía `_option_1`, el id que ya tenía la superviviente.
 */

/**
 * Genera un UUID v4 (con `crypto.randomUUID` cuando está disponible).
 * @returns {string}
 */
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Construye el array `options` de una categoría a partir del formulario.
 *
 * Conserva el id de las opciones que ya lo tenían y asigna uno irrepetible a las
 * nuevas (y a cualquier duplicado que llegue de datos antiguos).
 *
 * @param {Array<{id?: string|null, value: string}>} formOptions - Opciones del formulario
 * @param {string} docId - ID del documento de la categoría
 * @param {Function} [generateId=generateUUID] - Generador de ids (inyectable para tests)
 * @returns {Array<{id: string, name: string}>} Opciones listas para Firestore
 */
export const buildStableOptions = (formOptions, docId, generateId = generateUUID) => {
  const usedIds = new Set();

  return (formOptions || []).map((option) => {
    const canKeepId = Boolean(option.id) && !usedIds.has(option.id);
    const id = canKeepId ? option.id : `${docId}_option_${generateId()}`;
    usedIds.add(id);
    return { id, name: (option.value || '').trim() };
  });
};
