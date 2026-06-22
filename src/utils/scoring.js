/**
 * Cálculo de puntuaciones del concurso.
 *
 * Un voto acierta cuando el optionId elegido por el usuario coincide con el
 * optionId marcado como ganador en la categoría (`category.winner`).
 * Los puntos de cada acierto son el `weight` de la categoría (por defecto 1).
 *
 * NOTA: tanto los votos (`ballot.selections[catId]`) como los ganadores
 * (`category.winner`) se almacenan por optionId, no por nombre. Esto hace el
 * cálculo independiente del idioma.
 */

import { resolveOptionId } from './localize.js';

/**
 * Puntuación de un único ballot frente a los ganadores definidos.
 * Tolera datos legacy: tanto el ganador como el voto se normalizan a optionId
 * (por si alguno se guardó por nombre en el formato antiguo).
 * @param {Object} ballot
 * @param {Array} categories
 * @returns {number}
 */
export const scoreBallot = (ballot, categories) => {
  if (!ballot?.selections) return 0;
  return categories.reduce((total, category) => {
    const winnerId = resolveOptionId(category, category?.winner);
    const voteId = resolveOptionId(category, ballot.selections[category.id]);
    if (winnerId && voteId === winnerId) {
      return total + (category.weight || 1);
    }
    return total;
  }, 0);
};

/**
 * Tabla de clasificación ordenada de mayor a menor puntuación.
 * @param {Array} ballots
 * @param {Array} categories
 * @returns {Array<{rank:number,userId:string,nickname:string,points:number}>}
 */
export const computeLeaderboard = (ballots, categories) => {
  return (ballots || [])
    .map((ballot) => ({
      userId: ballot.userId,
      nickname: ballot.userDisplayName || ballot.userNickname || 'Anónimo',
      points: scoreBallot(ballot, categories),
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
};
