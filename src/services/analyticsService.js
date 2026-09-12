/**
 * Servicio de Analytics para TGA Ballot
 * Trackea eventos principales de la aplicación
 * Integrado con Google Firebase Analytics
 */

import { trackEvent } from '../firebase';

/**
 * NOTA DE PRIVACIDAD: ningún evento de este archivo puede llevar datos
 * personales (correo, apodo, nombre). Google Analytics no debe recibir PII —
 * lo prohíben sus propios términos y es un problema de RGPD. Si necesitas
 * distinguir usuarios, usa un identificador seudónimo, nunca el correo.
 */

/**
 * Track: Usuario inicia sesión
 */
export const trackLogin = async () => {
  await trackEvent('login', {
    method: 'google'
  });
};

/**
 * Track: Usuario cierra sesión
 */
export const trackLogout = async () => {
  await trackEvent('logout');
};

/**
 * Track: Usuario selecciona una opción en una categoría
 */
export const trackVoteSelected = async (categoryId, categoryTitle, option) => {
  await trackEvent('vote_selected', {
    category_id: categoryId,
    category_title: categoryTitle,
    option_selected: option
  });
};

/**
 * Track: Usuario cambia su voto en una categoría
 */
export const trackVoteChanged = async (categoryId, previousOption, newOption) => {
  await trackEvent('vote_changed', {
    category_id: categoryId,
    previous_option: previousOption,
    new_option: newOption
  });
};

/**
 * Track: Usuario envía su papeleta
 */
export const trackBallotSubmitted = async (totalVotes) => {
  await trackEvent('ballot_submitted', {
    total_votes: totalVotes
  });
};

/**
 * Track: Usuario navega a una categoría específica
 */
export const trackCategoryViewed = async (categoryId, categoryTitle, stepNumber, totalSteps) => {
  await trackEvent('category_viewed', {
    category_id: categoryId,
    category_title: categoryTitle,
    step: stepNumber,
    total_steps: totalSteps
  });
};

/**
 * Track: Usuario completa la revisión de votos
 */
export const trackReviewStarted = async (completedCategories, totalCategories) => {
  await trackEvent('review_started', {
    completed_categories: completedCategories,
    total_categories: totalCategories
  });
};

/**
 * Track: Usuario hace click en editar votos
 */
export const trackEditVotesClicked = async () => {
  await trackEvent('edit_votes_clicked');
};

/**
 * Track: Usuario intenta enviar papeleta incompleta
 */
export const trackIncompleteBallotAttempt = async (missingCategories) => {
  await trackEvent('incomplete_ballot_attempt', {
    missing_categories: missingCategories
  });
};

/**
 * Track: Acceso a panel de administración
 */
export const trackAdminAccessAttempted = async (isAuthorized) => {
  await trackEvent('admin_access_attempted', {
    authorized: isAuthorized
  });
};

/**
 * Track: Descarga de resultados
 */
export const trackResultsDownloaded = async (format) => {
  await trackEvent('results_downloaded', {
    format: format // 'json' o 'csv'
  });
};

/**
 * Track: Error capturado
 */
export const trackError = async (errorName, errorMessage, context = {}) => {
  await trackEvent('app_error', {
    error_name: errorName,
    error_message: errorMessage,
    ...context
  });
};

/**
 * Track: Página vista (custom event)
 */
export const trackPageView = async (pageName, properties = {}) => {
  await trackEvent('page_viewed', {
    page_name: pageName,
    ...properties
  });
};

/**
 * Track: Cambio de idioma
 */
export const trackLanguageChanged = async (language) => {
  await trackEvent('language_changed', {
    language: language
  });
};

/**
 * Track: Plazo de votación alcanzado
 */
export const trackDeadlineReached = async () => {
  await trackEvent('voting_deadline_reached');
};

/**
 * Track: Usuario intenta votar después del plazo
 */
export const trackPostDeadlineVoteAttempt = async () => {
  await trackEvent('post_deadline_vote_attempt');
};

/**
 * Track: Métrica de performance
 */
export const trackPerformanceMetric = async (metricName, value) => {
  await trackEvent('performance_metric', {
    metric_name: metricName,
    value: value
  });
};
