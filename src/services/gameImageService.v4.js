/**
 * Game Image Service - Hybrid Mode (Real API via Vite Proxy + Metadata Fallback)
 * 
 * ✅ Estrategia 2026 (Solución Final):
 * 1. Usa Vite proxy para obtener imágenes REALES de RAWG.io (sin CORS)
 * 2. Fallback a metadata estilizada si falla
 * 3. Combina lo mejor de ambos mundos
 * 
 * En desarrollo: Vite proxy redirige /api/rawg → https://api.rawg.io (sin CORS)
 * En producción: Necesita backend proxy o servicio serverless
 */

import { getGameMetadata } from '../data/gameMetadata';

// ============ Cache en memoria ============
const imageCache = new Map();

// ============ RAWG.io Config (Via Vite Proxy) ============
const RAWG_CONFIG = {
  // En desarrollo: usa /api/rawg (proxy de Vite)
  // En producción: cambiar a backend proxy o servicio serverless
  baseUrl: import.meta.env.DEV ? '/api/rawg' : 'https://api.rawg.io/api',
  apiKey: import.meta.env.VITE_RAWG_API_KEY || '',
};

/**
 * Normaliza nombre del juego para búsqueda
 */
function normalizeGameName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Obtiene imagen y metadata de RAWG.io (via Vite proxy en dev)
 */
async function fetchFromRAWG(gameName) {
  try {
    const params = new URLSearchParams({
      search: gameName,
      page_size: 1,
    });

    if (RAWG_CONFIG.apiKey) {
      params.append('key', RAWG_CONFIG.apiKey);
    }

    // En desarrollo: usa /api/rawg (Vite proxy)
    // En producción: redirige a backend proxy
    const url = `${RAWG_CONFIG.baseUrl}/games?${params}`;
    console.log(`🔍 Buscando en RAWG (proxy): ${url}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`RAWG HTTP Error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.results?.length > 0) {
      const game = data.results[0];
      return {
        name: game.name,
        image: game.background_image,
        platforms: game.platforms?.map(p => p.platform?.name).filter(Boolean) || [],
        rating: game.rating,
        releaseDate: game.released,
        genres: game.genres?.map(g => g.name) || [],
        source: 'rawg'
      };
    }

    return null;
  } catch (error) {
    console.warn(`RAWG fetch failed for "${gameName}":`, error.message);
    return null;
  }
}

/**
 * Función principal: obtiene datos de juego (imagen + metadata)
 * 
 * Intenta obtener desde RAWG primero (imágenes reales)
 * Si falla, retorna metadata estilizada (colores/emoji)
 */
export async function getGameImage(gameName) {
  if (!gameName || typeof gameName !== 'string') {
    return getGameMetadata('Unknown Game');
  }

  // ============ 1. Verifica cache ============
  if (imageCache.has(gameName)) {
    console.log(`📸 Cache hit: ${gameName}`);
    return imageCache.get(gameName);
  }

  console.log(`🎮 Obteniendo datos para: ${gameName}`);

  try {
    // ============ 2. Intenta RAWG (imágenes reales) ============
    const rawgData = await fetchFromRAWG(gameName);
    if (rawgData && rawgData.image) {
      console.log(`✅ Imagen obtenida de RAWG: ${gameName}`);
      imageCache.set(gameName, rawgData);
      return rawgData;
    }

    // ============ 3. Fallback a metadata estilizada ============
    console.warn(`⚠️ No encontrado en RAWG, usando metadata estilizada: ${gameName}`);
    const metadata = getGameMetadata(gameName);
    imageCache.set(gameName, metadata);
    return metadata;

  } catch (error) {
    console.error(`❌ Error en getGameImage(${gameName}):`, error);
    return getGameMetadata(gameName);
  }
}

/**
 * Precarga datos para múltiples juegos
 */
export async function preloadGameImages(gameNames = []) {
  if (!Array.isArray(gameNames)) return;

  console.log(`📦 Precargando ${gameNames.length} juegos...`);
  
  const results = await Promise.allSettled(
    gameNames.map(name => getGameImage(name))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Precargados: ${successful}/${gameNames.length}`);
  
  return results;
}

/**
 * Limpia el cache
 */
export function clearImageCache() {
  imageCache.clear();
  console.log('Cache limpiado');
}

/**
 * Estadísticas del cache
 */
export function getImageCacheStats() {
  return {
    totalCached: imageCache.size,
    cachedGames: Array.from(imageCache.keys()),
  };
}

/**
 * Obtiene solo la URL de imagen (útil para <img> tags)
 */
export async function getGameImageUrl(gameName) {
  const data = await getGameImage(gameName);
  return data?.image || data?.emoji || '🎮';
}
