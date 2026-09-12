/**
 * Cuántas veces puede un usuario rehacer su voto.
 *
 * Hasta ahora el voto era inmutable (`allow update: if false`). Ahora se puede
 * corregir mientras la votación siga abierta, pero con un tope: cada edición es
 * una escritura y una lectura extra, y sin límite una sola persona podría
 * reescribir su papeleta indefinidamente.
 *
 * El tope se cuenta en `ballot.editCount`: 0 en el envío inicial y +1 en cada
 * modificación. Quien manda es el SERVIDOR: `firestore.rules` exige que el
 * contador entrante sea exactamente el anterior + 1 y que no pase de
 * `maxBallotEdits()`. Este módulo es solo para la UI (decidir si se ofrece el
 * botón y cuántos cambios quedan), así que el número debe coincidir en los dos
 * sitios: si cambias uno, cambia el otro y sus tests.
 */

import { isVotingOpenNow } from './votingSchedule';

/** Modificaciones permitidas DESPUÉS del envío inicial. Espejo de firestore.rules. */
export const MAX_BALLOT_EDITS = 5;

/**
 * Ediciones que le quedan a un voto.
 * Tolera ballots antiguos, escritos antes de que existiera el contador.
 *
 * @param {Object|null} ballot - documento de ballots/{uid}
 * @returns {number} entre 0 y MAX_BALLOT_EDITS
 */
export const getRemainingEdits = (ballot) => {
  if (!ballot) return MAX_BALLOT_EDITS;
  const used = typeof ballot.editCount === 'number' ? ballot.editCount : 0;
  return Math.max(0, MAX_BALLOT_EDITS - used);
};

/**
 * ¿Puede este usuario rehacer su voto ahora mismo?
 * Hacen falta las dos condiciones: que queden cambios y que la votación siga
 * abierta (fuera de plazo las reglas rechazan también el `update`).
 *
 * @param {Object|null} ballot
 * @param {Object} votingConfig - config/voting
 * @param {number} [now]
 * @returns {boolean}
 */
export const canEditBallot = (ballot, votingConfig, now = Date.now()) => {
  if (!ballot) return false;
  if (getRemainingEdits(ballot) <= 0) return false;
  return isVotingOpenNow(votingConfig, now);
};
