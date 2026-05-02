/**
 * Game Image Service - SIMPLIFICADO
 * 
 * ℹ️ Nota: Carga de imagenes deshabilitada
 * Los componentes usan solo colores de fondo y gradientes
 */
import logger from './loggerService';

/**
 * Funcion dummy: no carga imagenes
 * Retorna undefined para que los componentes usen solo estilos
 */
export async function getGameImage(gameName) {
  return {
    image: undefined,
    name: gameName,
    source: 'disabled'
  };
}

/**
 * Dummy export para compatibilidad
 */
export function getPlaceholderSVG(text) {
  return undefined;
}

/**
 * Limpia todo el cache
 */
export function clearGameImageCache() {
  logger.log('Carga de imagenes deshabilitada');
}

/**
 * Limpia placeholders
 */
export function cleanPlaceholderCaches() {
  return 0;
}

/**
 * Obtiene estadisticas
 */
export function getCacheStats() {
  return {
    memoryCache: 0,
    localStorageCache: 0,
    totalCached: 0
  };
}

/**
 * Precarga imagenes (dummy)
 */
export async function preloadGameImages(gameNames = []) {
  return [];
}

/**
 * Limpia el cache
 */
export function clearImageCache() {
  logger.log('Carga de imagenes deshabilitada');
}

/**
 * Estadisticas
 */
export function getImageCacheStats() {
  return {
    totalCached: 0,
    cachedGames: [],
  };
}

/**
 * Obtiene URL de imagen (devuelve undefined)
 */
export async function getGameImageUrl(gameName) {
  return undefined;
}
