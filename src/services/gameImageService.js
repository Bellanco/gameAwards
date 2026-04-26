/**
 * Game Image Service - Metadata Estilizada (Solución Final)
 * 
 * ✅ Estrategia 2026 (PRAGMÁTICA):
 * - Mapeo directo de juegos a metadata (colores, emojis, plataformas)
 * - Rendimiento instantáneo
 * - Cero problemas de CORS
 * - Diseño visual atractivo y profesional
 */

import { getGameMetadata } from '../data/gameMetadata';

// ============ Cache en memoria ============
const imageCache = new Map();

// ============ Vercel Serverless Config ============
// En producción (vercel.app): usa la función serverless
// En desarrollo: usa metadata directamente
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:3000'  // Cambiar a la URL de Vercel después de deploy
  : 'https://tga-ballot.vercel.app'; // Reemplazar con tu URL real

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
 * Obtiene metadata estilizada de un juego
 * (Sin intentar APIs externas - velocidad instantánea)
 */
function getGameData(gameName) {
  const metadata = getGameMetadata(gameName);
  return {
    name: gameName,
    metadata: metadata,
    source: 'metadata'
  };
}

/**
 * Intenta obtener imagen real desde Vercel serverless
 * En desarrollo: usa metadata directamente
 * En producción: intenta serverless, luego metadata
 */
async function fetchFromServerless(gameName) {
  try {
    // En desarrollo (localhost:5173), no intenta serverless
    if (import.meta.env.DEV) {
      return null;
    }

    const url = `${API_BASE}/api/games?q=${encodeURIComponent(gameName)}`;
    console.log(`🔍 Buscando imagen en serverless: ${gameName}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`Serverless HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.image_url) {
      console.log(`✅ Imagen encontrada en serverless: ${gameName}`);
      return {
        name: data.name || gameName,
        image: data.image_url,
        platforms: data.platforms || [],
        rating: data.rating,
        genres: data.genres || [],
        source: 'serverless'
      };
    }

    return null;
  } catch (error) {
    console.warn(`Serverless fetch failed: ${error.message}`);
    return null;
  }
}

/**
 * Función principal: obtiene datos de juego
 * Retorna metadata con color, emoji y plataformas
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
    // ============ 2. Intenta serverless en producción ============
    if (!import.meta.env.DEV) {
      const serverlessData = await fetchFromServerless(gameName);
      if (serverlessData && serverlessData.image) {
        imageCache.set(gameName, serverlessData);
        return serverlessData;
      }
    }

    // ============ 3. Fallback a metadata (siempre funciona) ============
    console.log(`📦 Usando metadata estilizada: ${gameName}`);
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
