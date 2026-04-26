/**
 * Base de datos SIMPLE de juegos - Solo títulos
 * Las imágenes se cargan dinámicamente desde APIs en gameImageService.js
 * 
 * Estructura minimalista para fácil mantenimiento anual
 */
const games = [
  "Elden Ring: Shadow of the Erdtree",
  "Astro Bot",
  "Final Fantasy VII Rebirth",
  "Metaphor: ReFantazio",
  "Balatro",
  "Black Myth: Wukong",
  "Alan Wake 2",
  "Like a Dragon: Infinite Wealth",
  "Silent Hill 2",
  "Neva"
];

/**
 * Imágenes de fondo por categoría (Wikipedia Commons - sin CORS bloqueado)
 */
export const categoryBackgrounds = {
  "gameOfTheYear": "https://upload.wikimedia.org/wikipedia/en/0/0f/Elden_Ring_Shadow_of_the_Erdtree_Cover_Art.jpg",
  "bestArtDirection": "https://upload.wikimedia.org/wikipedia/en/1/15/FF7_Rebirth_Cover.jpg",
  "bestNarrative": "https://upload.wikimedia.org/wikipedia/en/6/6e/Silent_Hill_2_Remake_cover.jpg",
  "bestGameplay": "https://upload.wikimedia.org/wikipedia/en/f/f2/Metaphor_ReFantazio_cover.jpg",
  "bestSoundtrack": "https://upload.wikimedia.org/wikipedia/en/5/57/Black_Myth_Wukong_cover.jpg",
  "bestPerformance": "https://upload.wikimedia.org/wikipedia/en/4/45/Balatro_cover.jpg",
  "bestMultiplayer": "https://upload.wikimedia.org/wikipedia/en/8/85/Alan_Wake_2_cover.jpg",
  "bestVisuals": "https://upload.wikimedia.org/wikipedia/en/1/1f/Like_a_Dragon_Infinite_Wealth_cover.jpg",
  "bestStudio": "https://upload.wikimedia.org/wikipedia/en/7/74/Neva_video_game_cover.jpg",
  "bestDirector": "https://upload.wikimedia.org/wikipedia/en/4/4d/Senua%27s_Saga_Hellblade_2_cover.jpg"
};

/**
 * IMPORTANTE: Para usar imágenes dinámicas en VoteScreen/ReviewScreen:
 * 
 * 1. Importa el servicio:
 *    import { getGameImage } from '../services/gameImageService';
 * 
 * 2. Úsalo en el componente:
 *    const imageUrl = await getGameImage(gameName);
 *    <img src={imageUrl} alt={gameName} />
 * 
 * 3. O precarga todas las imágenes al montar:
 *    useEffect(() => {
 *      preloadGameImages(categories.flatMap(c => c.options));
 *    }, []);
 */

/**
 * Obtener lista de juegos
 */
export const getGamesList = () => games;

/**
 * Obtener imagen de un juego (legacy - para compatibilidad)
 * MEJOR: Usa directamente gameImageService.getGameImage()
 */
export const getGameImage = async (gameName) => {
  // Este archivo ahora solo contiene datos estáticos
  // Las imágenes dinámicas se cargan desde gameImageService
  return `https://via.placeholder.com/400x600/1f2937/ffffff?text=${encodeURIComponent(gameName)}`;
};
