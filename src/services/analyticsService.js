/**
 * Servicio de Analytics para TGA Ballot (Google Firebase Analytics).
 *
 * ALCANCE DELIBERADO: aquí solo vive lo que está REALMENTE cableado. Antes este
 * archivo exportaba 17 funciones de las que solo se llamaba una, y
 * `ANALYTICS_SETUP.md` las documentaba como si estuvieran activas: la app no
 * registraba ni logins, ni votos, ni envíos. Se ha cableado el embudo —que es lo
 * que interesa medir en un formulario de varios pasos: dónde se cae la gente— y
 * se ha borrado el resto. Si hace falta un evento nuevo, se añade Y se llama.
 *
 * NOTA DE PRIVACIDAD: ningún evento puede llevar datos personales (correo,
 * apodo, nombre). Google Analytics no debe recibir PII — lo prohíben sus propios
 * términos y es un problema de RGPD. Si hace falta distinguir usuarios, usa un
 * identificador seudónimo, nunca el correo.
 */

import { trackEvent } from '../firebase';

/**
 * Track: el usuario inicia sesión.
 * Cableado en App.handleLogin.
 */
export const trackLogin = async () => {
  await trackEvent('login', { method: 'google' });
};

/**
 * Track: el usuario llega a una categoría.
 * Cableado en VoteScreen. Es la métrica de embudo: comparando `step` se ve en
 * qué categoría abandona la gente.
 */
export const trackCategoryViewed = async (categoryId, stepNumber, totalSteps) => {
  await trackEvent('category_viewed', {
    category_id: categoryId,
    step: stepNumber,
    total_steps: totalSteps,
  });
};

/**
 * Track: el usuario envía su porra (final del embudo).
 * Cableado en App.submitBallot, tras confirmar la escritura en Firestore.
 */
export const trackBallotSubmitted = async (totalVotes) => {
  await trackEvent('ballot_submitted', { total_votes: totalVotes });
};

/**
 * Track: cambio de idioma.
 * Cableado en App.toggleLanguage. Dice si la traducción al inglés se usa.
 */
export const trackLanguageChanged = async (language) => {
  await trackEvent('language_changed', { language });
};

/**
 * Track: error capturado.
 * Cableado en errorService.logError, que ya envía el mensaje SANEADO (y el
 * contexto solo en desarrollo).
 */
export const trackError = async (errorName, errorMessage, context = {}) => {
  await trackEvent('app_error', {
    error_name: errorName,
    error_message: errorMessage,
    ...context,
  });
};
