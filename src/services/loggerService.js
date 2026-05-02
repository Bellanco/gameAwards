/**
 * Logger Service
 * Desabilita logs en producción, los muestra solo en desarrollo
 * Cuando despliegues en CloudFlare (producción), los logs no aparecerán
 */

const isDevelopment = import.meta.env.MODE === 'development' || !import.meta.env.PROD;

const logger = {
  log: (...args) => {
    if (isDevelopment) console.log(...args);
  },
  warn: (...args) => {
    if (isDevelopment) console.warn(...args);
  },
  error: (...args) => {
    if (isDevelopment) console.error(...args);
  },
  debug: (...args) => {
    if (isDevelopment) console.debug(...args);
  },
  // Siempre loguea errores críticos (incluso en producción)
  critical: (...args) => {
    console.error('[CRITICAL]', ...args);
  }
};

export default logger;
