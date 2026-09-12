/**
 * Código de error de Firebase Auth -> clave de i18n.
 *
 * Vive aquí, y no dentro de `useAuthSession`, porque hay DOS puntos de entrada
 * al login: el flujo público y el panel de admin. El panel se quedó fuera del
 * mapeo original y seguía pintando `error.message` crudo, que puede llevar
 * detalles internos de Firebase (y siempre en inglés, en una app bilingüe).
 *
 * Lo que no esté en la tabla cae en `errorSignInGeneric`: nunca se enseña el
 * mensaje de Firebase tal cual.
 */

/** @type {Object.<string, string>} */
export const AUTH_ERROR_KEYS = {
  'auth/popup-blocked': 'errorPopupBlocked',
  'auth/popup-closed-by-user': 'errorPopupClosed',
  'auth/network-request-failed': 'errorNetwork',
  'auth/unauthorized-domain': 'errorUnauthorizedDomain',
  'auth/operation-not-supported-in-this-environment': 'errorPopupUnsupported',
};

/**
 * Traduce un error de Firebase Auth a un texto seguro para enseñar.
 * @param {Function} t - traductor (useTranslation)
 * @param {{code?: string}} error
 * @returns {string}
 */
export const authErrorMessage = (t, error) =>
  t(AUTH_ERROR_KEYS[error?.code] || 'errorSignInGeneric');
