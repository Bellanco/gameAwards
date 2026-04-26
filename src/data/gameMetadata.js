/**
 * Mapeo de juegos con información por plataforma
 * Estrategia: Placeholders estilizados sin CORS bloqueado
 * 
 * Evita todos los problemas de cross-origin image bloqueado
 * Funciona para PS5, Xbox, PC, Nintendo, etc.
 */

export const gameMetadata = {
  // 2024 Game Awards Nominees
  "Elden Ring: Shadow of the Erdtree": {
    platforms: ["PlayStation 5", "Xbox Series X|S", "PC"],
    color: "#FFD700", // Gold
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Astro Bot": {
    platforms: ["PlayStation 5"],
    color: "#FF6B6B", // Red/Robot
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Final Fantasy VII Rebirth": {
    platforms: ["PlayStation 5"],
    color: "#00A8FF", // Blue
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Metaphor: ReFantazio": {
    platforms: ["PlayStation 5", "Xbox Series X|S", "PC"],
    color: "#9B59B6", // Purple
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Balatro": {
    platforms: ["Multi-Platform"],
    color: "#E74C3C", // Red
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Black Myth: Wukong": {
    platforms: ["PlayStation 5", "Xbox Series X|S", "PC"],
    color: "#F39C12", // Orange/Gold
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Alan Wake 2": {
    platforms: ["PlayStation 5", "Xbox Series X|S", "PC"],
    color: "#34495E", // Dark Gray
    accentColor: "#F1C40F",
    year: 2023
  },
  "Like a Dragon: Infinite Wealth": {
    platforms: ["PlayStation 5", "Xbox Series X|S", "PC"],
    color: "#E84C3D", // Red
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Silent Hill 2": {
    platforms: ["PlayStation 5", "Xbox Series X|S", "PC"],
    color: "#2C3E50", // Very Dark Gray
    accentColor: "#C0392B",
    year: 2024
  },
  "Neva": {
    platforms: ["PlayStation 5", "Xbox Series X|S", "PC", "Nintendo Switch"],
    color: "#3498DB", // Blue
    accentColor: "#1a1a2e",
    year: 2024
  },
  "Senua's Saga: Hellblade II": {
    platforms: ["Xbox Series X|S", "PC"],
    color: "#8B0000", // Dark Red
    accentColor: "#FFD700",
    year: 2024
  }
};

/**
 * Obtiene metadata de un juego
 * @param {string} gameName - Nombre del juego
 * @returns {Object} Metadata con colores, plataformas, emoji
 */
export function getGameMetadata(gameName) {
  return gameMetadata[gameName] || {
    platforms: ["Multi-Platform"],
    color: "#95A5A6",
    accentColor: "#1a1a2e",
    year: 2024
  };
}

/**
 * Obtiene todas las plataformas únicas
 * @returns {Array} Lista de plataformas
 */
export function getAllPlatforms() {
  const platforms = new Set();
  Object.values(gameMetadata).forEach(game => {
    game.platforms.forEach(p => platforms.add(p));
  });
  return Array.from(platforms).sort();
}

/**
 * Busca juegos por plataforma
 * @param {string} platform - Plataforma (ej: "PlayStation 5")
 * @returns {Array} Juegos en esa plataforma
 */
export function getGamesByPlatform(platform) {
  return Object.entries(gameMetadata)
    .filter(([_, data]) => data.platforms.includes(platform))
    .map(([name, _]) => name);
}
