/**
 * Utilidades para asignar degradados aleatorios a imágenes
 */

const GRADIENTS = [
  // Acero y noche
  'bg-gradient-to-br from-slate-900/85 to-slate-700/80',
  'bg-gradient-to-br from-zinc-900/85 to-slate-800/80',
  'bg-gradient-to-br from-slate-800/85 to-cyan-900/75',

  // Roble, cuero y pergamino
  'bg-gradient-to-br from-amber-900/85 to-stone-700/80',
  'bg-gradient-to-br from-orange-900/80 to-amber-700/75',
  'bg-gradient-to-br from-stone-800/85 to-amber-800/75',

  // Brillo runico contenido
  'bg-gradient-to-br from-cyan-900/80 to-slate-700/75',
  'bg-gradient-to-br from-sky-900/80 to-zinc-700/75',
  'bg-gradient-to-br from-teal-900/80 to-slate-700/75',

  // Vegetacion oscura / pantano
  'bg-gradient-to-br from-emerald-900/80 to-slate-700/75',
  'bg-gradient-to-br from-green-900/80 to-stone-700/75',
  'bg-gradient-to-br from-lime-900/75 to-slate-700/75',

  // Sangre y acero
  'bg-gradient-to-br from-red-900/80 to-zinc-700/75',
  'bg-gradient-to-br from-rose-900/80 to-stone-700/75',
  'bg-gradient-to-br from-red-950/80 to-amber-900/70',

  // Variantes de contraste para listas largas
  'bg-gradient-to-br from-slate-950/85 to-amber-900/75',
  'bg-gradient-to-br from-zinc-900/85 to-teal-900/70',
  'bg-gradient-to-br from-stone-900/85 to-cyan-900/70',
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
