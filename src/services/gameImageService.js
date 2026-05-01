/**
 * Game Image Service - RAWG API + Cloudflare Pages Functions + localStorage Cache
 * 
 * ✅ Estrategia 2026 (OPTIMIZADA):
 * - Cache en memoria (rápido)
 * - Cache en localStorage (persistente entre sesiones)
 * - API RAWG vía Cloudflare Pages Functions (imágenes reales en producción)
 * - Fallback a metadata local (siempre funciona)
 * - Cero problemas de CORS
 */

// ============ Cache en memoria ============
const imageCache = new Map();

// ============ localStorage Config ============
const CACHE_KEY = 'tga_game_images_cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// ============ Cloudflare Pages Functions Config ============
// En desarrollo: http://localhost:8788 (Wrangler dev server)
// En producción: URL relativa /api/games (resuelve automáticamente)
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:8788'
  : '';

/**
 * Obtiene cache de localStorage
 * @returns {Object} Cache deserializado o {}
 */
function getLocalStorageCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    
    const parsed = JSON.parse(cached);
    // Limpiar entradas expiradas
    Object.keys(parsed).forEach(key => {
      if (parsed[key].expiresAt && Date.now() > parsed[key].expiresAt) {
        delete parsed[key];
      }
    });
    
    return parsed;
  } catch (error) {
    console.warn('localStorage read error:', error);
    return {};
  }
}

/**
 * Guarda en localStorage
 */
function saveToLocalStorage(gameName, data) {
  try {
    const cache = getLocalStorageCache();
    cache[gameName] = {
      ...data,
      expiresAt: Date.now() + CACHE_EXPIRY_MS
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('localStorage write error:', error);
  }
}

/**
 * Obtiene del localStorage
 */
function getFromLocalStorage(gameName) {
  const cache = getLocalStorageCache();
  if (cache[gameName] && (!cache[gameName].expiresAt || Date.now() < cache[gameName].expiresAt)) {
    console.log(`📱 localStorage hit: ${gameName}`);
    return cache[gameName];
  }
  return null;
}

/**
 * Intenta obtener imagen real desde Cloudflare Pages Functions con RAWG API
 * En desarrollo: usa metadata directamente
 * En producción: intenta Cloudflare Function con RAWG, luego metadata
 */
async function fetchFromServerless(gameName) {
  try {
    // En desarrollo, no intenta serverless
    if (import.meta.env.DEV) {
      return null;
    }

    const url = `${API_BASE}/api/games?q=${encodeURIComponent(gameName)}`;
    console.log(`🔍 Buscando imagen en Cloudflare/RAWG: ${gameName}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
    });

    if (!response.ok) {
      console.warn(`Cloudflare Function HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.image_url) {
      console.log(`✅ Imagen encontrada en RAWG: ${gameName}`);
      return {
        name: data.name || gameName,
        image: data.image_url,
        platforms: data.platforms || [],
        rating: data.rating,
        genres: data.genres || [],
        releaseDate: data.release_date,
        source: 'rawg'
      };
    }

    return null;
  } catch (error) {
    console.warn(`Cloudflare Function fetch failed: ${error.message}`);
    return null;
  }
}

/**
 * Función principal: obtiene datos de juego con caché multinivel
 * 
 * @typedef {Object} GameImageReturn
 * @property {string} image - URL de imagen o fallback
 * @property {string} name - Nombre del juego
 * @property {string} source - Fuente ('memory'|'localStorage'|'rawg'|'metadata')
 * @property {Array} [platforms] - Plataformas del juego
 * @property {number} [rating] - Rating de RAWG
 * 
 * @param {string} gameName - Nombre del juego
 * @returns {Promise<GameImageReturn>}
 */
export async function getGameImage(gameName) {
  if (!gameName || typeof gameName !== 'string') {
    return {
      image: 'https://via.placeholder.com/400x600/1f2937/ffffff?text=Unknown',
      name: 'Unknown Game',
      source: 'placeholder'
    };
  }

  console.log(`🎮 getGameImage('${gameName}')`);

  // ============ 1. Cache en memoria (más rápido) ============
  if (imageCache.has(gameName)) {
    console.log(`💾 Memory cache hit: ${gameName}`);
    return imageCache.get(gameName);
  }

  // ============ 2. Cache en localStorage (persistente) ============
  const localData = getFromLocalStorage(gameName);
  if (localData) {
    imageCache.set(gameName, localData); // Repoblar memory cache
    return localData;
  }

  try {
    // ============ 3. API RAWG vía Cloudflare Pages Functions (producción) ============
    const serverlessData = await fetchFromServerless(gameName);
    if (serverlessData && serverlessData.image) {
      imageCache.set(gameName, serverlessData);
      saveToLocalStorage(gameName, serverlessData);
      return serverlessData;
    }

    // ============ 4. Fallback a placeholder ============
    console.log(`📦 Fallback a placeholder: ${gameName}`);
    const fallback = {
      image: `https://via.placeholder.com/400x600/1f2937/ffffff?text=${encodeURIComponent(gameName)}`,
      name: gameName,
      source: 'placeholder'
    };
    imageCache.set(gameName, fallback);
    saveToLocalStorage(gameName, fallback);
    return fallback;

  } catch (error) {
    console.error(`❌ Error en getGameImage('${gameName}'):`, error);
    const fallback = {
      image: `https://via.placeholder.com/400x600/1f2937/ffffff?text=${encodeURIComponent(gameName)}`,
      name: gameName,
      source: 'placeholder'
    };
    imageCache.set(gameName, fallback);
    return fallback;
  }
}

/**
 * Limpia todo el cache (localStorage + memoria)
 */
export function clearGameImageCache() {
  imageCache.clear();
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('✅ Cache limpiado (memoria + localStorage)');
  } catch (error) {
    console.warn('Error limpiando cache:', error);
  }
}

/**
 * Obtiene estadísticas del cache
 */
export function getCacheStats() {
  const memoryCacheSize = imageCache.size;
  const localCache = getLocalStorageCache();
  const localStorageSize = Object.keys(localCache).length;
  
  return {
    memoryCache: memoryCacheSize,
    localStorageCache: localStorageSize,
    totalCached: memoryCacheSize + localStorageSize
  };
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
