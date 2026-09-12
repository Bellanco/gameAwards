/**
 * Saneado del texto que introduce el usuario antes de guardarlo en Firestore.
 *
 * El recorte a 50 caracteres es el que evita un rechazo de las reglas, que
 * imponen el mismo tope en servidor (ver firestore.rules, isValidBallot).
 *
 * La eliminación de `<` y `>` es heredada y puramente cosmética: React escapa
 * todo lo que renderiza, así que no aporta seguridad y sí estropea nombres
 * legítimos («Ana <3»). Se conserva el comportamiento anterior a propósito;
 * retirarla es el hallazgo 2.9 de la auditoría.
 */

/** Longitud máxima, la misma que exigen las reglas de Firestore. */
export const MAX_USER_TEXT_LENGTH = 50;

/**
 * @param {string|null|undefined} value
 * @returns {string} Texto saneado (puede quedar vacío)
 */
export const sanitizeUserText = (value) =>
  (value || '')
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, MAX_USER_TEXT_LENGTH)
    .trim();
