/**
 * Utilidades para asignar degradados aleatorios a imágenes
 */

const GRADIENTS = [
  'bg-gradient-to-br from-blue-600/80 to-purple-600/80',
  'bg-gradient-to-br from-pink-600/80 to-rose-600/80',
  'bg-gradient-to-br from-emerald-600/80 to-teal-600/80',
  'bg-gradient-to-br from-amber-600/80 to-orange-600/80',
  'bg-gradient-to-br from-indigo-600/80 to-blue-600/80',
  'bg-gradient-to-br from-cyan-600/80 to-blue-600/80',
  'bg-gradient-to-br from-violet-600/80 to-purple-600/80',
];

/**
 * Asigna degradados aleatorios a un array de juegos
 * @param {string[]} gameNames - Array de nombres de juegos
 * @returns {Object} Objeto con {gameName: gradientClass}
 */
export function getRandomGradients(gameNames) {
  const gradients = {};
  const usedIndices = new Set();
  
  gameNames.forEach((gameName) => {
    if (gameName && !gradients[gameName]) {
      let randomIndex;
      
      // Si no hay degradados disponibles, reutilizar desde el inicio
      if (usedIndices.size >= GRADIENTS.length) {
        randomIndex = Math.floor(Math.random() * GRADIENTS.length);
      } else {
        // Encontrar un índice no utilizado
        do {
          randomIndex = Math.floor(Math.random() * GRADIENTS.length);
        } while (usedIndices.has(randomIndex));
        usedIndices.add(randomIndex);
      }
      
      gradients[gameName] = GRADIENTS[randomIndex];
    }
  });
  
  return gradients;
}
