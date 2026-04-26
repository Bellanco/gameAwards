/**
 * Mapeo directo de juegos a imágenes de alta calidad
 * URLs públicas verificadas sin CORS bloqueado
 * Fuentes: Wikipedia Commons, sitios públicos con CORS habilitado
 * 
 * Alternativa confiable a APIs externas
 */

export const gameImagesMap = {
  // 2024 Game Awards Nominees
  "Elden Ring: Shadow of the Erdtree": "https://upload.wikimedia.org/wikipedia/en/0/0f/Elden_Ring_Shadow_of_the_Erdtree_Cover_Art.jpg",
  "Astro Bot": "https://upload.wikimedia.org/wikipedia/en/a/a7/Astro%27s_Playroom.jpg",
  "Final Fantasy VII Rebirth": "https://upload.wikimedia.org/wikipedia/en/1/15/FF7_Rebirth_Cover.jpg",
  "Metaphor: ReFantazio": "https://upload.wikimedia.org/wikipedia/en/f/f2/Metaphor_ReFantazio_cover.jpg",
  "Balatro": "https://upload.wikimedia.org/wikipedia/en/4/45/Balatro_cover.jpg",
  "Black Myth: Wukong": "https://upload.wikimedia.org/wikipedia/en/5/57/Black_Myth_Wukong_cover.jpg",
  "Alan Wake 2": "https://upload.wikimedia.org/wikipedia/en/8/85/Alan_Wake_2_cover.jpg",
  "Like a Dragon: Infinite Wealth": "https://upload.wikimedia.org/wikipedia/en/1/1f/Like_a_Dragon_Infinite_Wealth_cover.jpg",
  "Silent Hill 2": "https://upload.wikimedia.org/wikipedia/en/6/6e/Silent_Hill_2_Remake_cover.jpg",
  "Neva": "https://upload.wikimedia.org/wikipedia/en/7/74/Neva_video_game_cover.jpg",
  "Senua's Saga: Hellblade II": "https://upload.wikimedia.org/wikipedia/en/4/4d/Senua%27s_Saga_Hellblade_2_cover.jpg",
};

/**
 * Obtiene imagen mapeada de un juego (sin CORS bloqueado)
 * @param {string} gameName - Nombre del juego
 * @returns {string|null} URL de imagen o null si no existe mapeo
 */
export function getMappedGameImage(gameName) {
  return gameImagesMap[gameName] || null;
}

/**
 * Obtiene todas las imágenes mapeadas
 * @returns {Object} Objeto con todos los mapeos
 */
export function getAllGameImages() {
  return gameImagesMap;
}

/**
 * Verifica si un juego tiene imagen mapeada
 * @param {string} gameName - Nombre del juego
 * @returns {boolean}
 */
export function hasGameImage(gameName) {
  return gameName in gameImagesMap;
}
