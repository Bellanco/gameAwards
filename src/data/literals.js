/**
 * Internacionalización (i18n) - Sistema centralizado
 * Los literales están organizados en: src/data/i18n/es.js y src/data/i18n/en.js
 */

import { es } from './i18n/es';
import { en } from './i18n/en';

const translations = {
  es,
  en,
};

/**
 * Hook para obtener textos en el idioma actual
 * Uso: const t = useTranslation(language)
 *      t('loginBtn')
 */
export const useTranslation = (language = 'es') => {
  return (key) => translations[language]?.[key] || key;
};

/**
 * Obtener todos los textos en un idioma
 */
export const getTranslations = (language = 'es') => {
  return translations[language] || translations.es;
};

/**
 * Retrocompatibilidad - appText por defecto en español
 */
export const appText = translations.es;
