/**
 * Servicio de Error Handling para TGA Ballot
 * Registra errores para debugging y monitoreo
 * Se puede integrar con Firebase Crashlytics en el futuro
 */

import logger from './loggerService';

/**
 * Tipos de error
 */
export const ERROR_TYPES = {
  AUTH_ERROR: 'AUTH_ERROR',
  FIRESTORE_ERROR: 'FIRESTORE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UI_ERROR: 'UI_ERROR',
  COMPONENT_ERROR: 'COMPONENT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Registra un error
 * @param {string} errorType - Tipo de error (ver ERROR_TYPES)
 * @param {Error|string} error - El error a registrar
 * @param {object} context - Contexto adicional
 */
export const logError = async (errorType, error, context = {}) => {
  const isDev = import.meta.env.MODE === 'development';
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;

  // En producción, no incluir stack traces ni contexto sensible
  const errorData = {
    type: errorType,
    message: isDev ? errorMessage : 'Error en aplicación',
    stack: isDev ? stackTrace : undefined,
    timestamp: new Date().toISOString(),
    ...(isDev ? context : {}) // Contexto solo en desarrollo
  };

  // Log en desarrollo
  logger.error(`[${errorType}]`, errorData);

  // Track en Analytics (sin await para no bloquear)
  try {
    const { trackError } = await import('./analyticsService');
    trackError(errorType, errorMessage, context).catch(e => logger.warn('Analytics tracking failed', e));
  } catch (e) {
    logger.warn('Could not import analytics service', e);
  }

  // Persistir en localStorage para análisis posterior (sanitizado)
  try {
    const errorLog = JSON.parse(localStorage.getItem('appErrorLog') || '[]');
    errorLog.push(errorData);
    // Mantener solo los últimos 20 errores (no 50)
    if (errorLog.length > 20) {
      errorLog.shift();
    }
    localStorage.setItem('appErrorLog', JSON.stringify(errorLog));
  } catch (e) {
    logger.warn('No se pudo guardar error log', e);
  }

  return errorData;
};

/**
 * Obtiene el log de errores del localStorage
 */
export const getErrorLog = () => {
  try {
    return JSON.parse(localStorage.getItem('appErrorLog') || '[]');
  } catch {
    return [];
  }
};

/**
 * Limpia el log de errores
 */
export const clearErrorLog = () => {
  localStorage.removeItem('appErrorLog');
};

/**
 * Exporta el log de errores como archivo
 */
export const downloadErrorLog = () => {
  const errorLog = getErrorLog();
  const dataStr = JSON.stringify(errorLog, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `error-log-${new Date().toISOString()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Error handler global para errores no capturados
 */
export const setupGlobalErrorHandler = () => {
  // Manejo de errores no capturados
  window.addEventListener('error', (event) => {
    logError(
      ERROR_TYPES.UNKNOWN_ERROR,
      event.error || event.message,
      {
        source: event.filename,
        line: event.lineno,
        column: event.colno
      }
    );
  });

  // Manejo de promesas rechazadas no capturadas
  window.addEventListener('unhandledrejection', (event) => {
    logError(
      ERROR_TYPES.UNKNOWN_ERROR,
      event.reason,
      {
        type: 'unhandledPromiseRejection'
      }
    );
  });
};

/**
 * Wrap para funciones async con error handling
 */
export const withErrorHandling = async (fn, errorType = ERROR_TYPES.UNKNOWN_ERROR) => {
  try {
    return await fn();
  } catch (error) {
    logError(errorType, error);
    throw error;
  }
};
