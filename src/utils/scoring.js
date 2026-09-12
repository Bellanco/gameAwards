/**
 * Cálculo de puntuaciones del concurso.
 *
 * Un voto acierta cuando el optionId elegido por el usuario coincide con el
 * optionId marcado como ganador de la categoría. Los puntos de cada acierto son
 * el `weight` de la categoría (por defecto 1).
 *
 * DÓNDE VIVEN LOS GANADORES: en `admin/winners`, que solo lee un administrador
 * (ver winnersService). Antes estaban en `categories/{id}.winner`, y esa
 * colección es de lectura pública porque la app necesita los nominados para
 * poder votar: cualquiera podía consultar los ganadores antes de que se
 * anunciaran. Por eso estas funciones reciben el mapa de ganadores como
 * parámetro en vez de leerlo de la categoría.
 *
 * Se sigue aceptando `category.winner` como respaldo: es lo que traen los
 * archivos históricos (`categoriesSnapshot`) y los datos aún sin migrar.
 *
 * NOTA: tanto los votos (`ballot.selections[catId]`) como los ganadores se
 * almacenan por optionId, no por nombre. Esto hace el cálculo independiente del
 * idioma.
 */

import { resolveOptionId } from './localize.js';
import { hashUid } from './pseudonym.js';

/**
 * Ganador efectivo de una categoría: el del mapa si lo hay, si no el que traiga
 * la propia categoría (histórico / legacy).
 * @param {Object} category
 * @param {Object.<string,string>|null} winners
 * @returns {string|null} optionId normalizado
 */
const winnerOf = (category, winners) => {
  const raw = winners && category?.id in winners ? winners[category.id] : category?.winner;
  return resolveOptionId(category, raw);
};

/**
 * Puntuación de un único ballot frente a los ganadores definidos.
 * Tolera datos legacy: tanto el ganador como el voto se normalizan a optionId
 * (por si alguno se guardó por nombre en el formato antiguo).
 * @param {Object} ballot
 * @param {Array} categories
 * @param {Object.<string,string>} [winners] - mapa categoryId -> optionId ganador
 * @returns {number}
 */
export const scoreBallot = (ballot, categories, winners = null) => {
  if (!ballot?.selections) return 0;
  return categories.reduce((total, category) => {
    const winnerId = winnerOf(category, winners);
    const voteId = resolveOptionId(category, ballot.selections[category.id]);
    if (winnerId && voteId === winnerId) {
      return total + (category.weight || 1);
    }
    return total;
  }, 0);
};

/**
 * Tabla de clasificación ordenada de mayor a menor puntuación.
 *
 * Cada entrada lleva el `userId` (lo necesita el panel de admin, que trabaja
 * sobre los votos en vivo) y además su huella `uidHash`. Al ARCHIVAR, el
 * snapshot público se queda solo con la huella: ver
 * `seasonService.buildSeasonSnapshot` y `utils/pseudonym.js`.
 *
 * @param {Array} ballots
 * @param {Array} categories
 * @param {Object.<string,string>} [winners] - mapa categoryId -> optionId ganador
 * @returns {Array<{rank:number,userId:string,uidHash:string,nickname:string,points:number}>}
 */
export const computeLeaderboard = (ballots, categories, winners = null) => {
  return (ballots || [])
    .map((ballot) => ({
      userId: ballot.userId,
      uidHash: hashUid(ballot.userId),
      nickname: ballot.userDisplayName || ballot.userNickname || 'Anónimo',
      points: scoreBallot(ballot, categories, winners),
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
};
