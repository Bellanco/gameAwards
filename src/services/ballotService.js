/**
 * Servicio de papeletas (votos).
 *
 * El UID de Firebase es el ID del documento: eso garantiza un voto por persona.
 * Las reglas solo permiten `create` (nunca `update`), así que un voto emitido no
 * se puede sobrescribir; el reinicio anual los borra para abrir la siguiente
 * edición.
 *
 * El esquema que se escribe aquí lo valida también el servidor
 * (firestore.rules > isValidBallot). Si cambias un campo, cambia las reglas.
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sanitizeUserText } from '../utils/sanitize';
import { logError, ERROR_TYPES } from './errorService';

/**
 * Construye el documento del voto a partir del estado de la app.
 *
 * Los votos se guardan por **optionId**, no por nombre: así son independientes
 * del idioma y sobreviven a un cambio de texto del nominado.
 *
 * Función pura y exportada aparte para poder probarla sin tocar Firestore.
 *
 * @param {Object} params
 * @param {Object} params.currentUser - Usuario de Firebase Auth
 * @param {Object} params.userVotes - { categoryId: { id, name } }
 * @param {string} params.displayName - Nombre visible, ya saneado
 * @param {number} params.season - Temporada activa
 * @returns {Object} Documento listo para Firestore
 */
export function buildBallot({ currentUser, userVotes, displayName, season }) {
  const selections = {};
  Object.entries(userVotes).forEach(([categoryId, vote]) => {
    selections[categoryId] = vote.id;
  });

  return {
    userId: currentUser.uid,
    userEmail: currentUser.email,
    // Nombre de la cuenta de Google (no editable). Se lee de currentUser, nunca
    // de estado, para que no pueda quedar vacío.
    userNickname: sanitizeUserText(currentUser.displayName) || displayName,
    userDisplayName: displayName,
    selections,
    season: Math.trunc(season), // las reglas exigen un entero
    submittedAt: new Date().toISOString(),
    isActive: true,
  };
}

/**
 * Guarda el voto del usuario. El documento es `ballots/{uid}`.
 *
 * @param {Object} params - Los mismos que `buildBallot`
 * @returns {Promise<{selectionCount: number}>}
 */
export async function submitBallot(params) {
  try {
    const ballot = buildBallot(params);
    await setDoc(doc(db, 'ballots', params.currentUser.uid), ballot);
    return { selectionCount: Object.keys(ballot.selections).length };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'ballotService - submitBallot',
    });
    throw error;
  }
}

/**
 * ¿Este usuario ya tiene un voto registrado? (bloqueo de re-voto)
 *
 * Ante un error de lectura devuelve `false`: no se bloquea a nadie por un fallo
 * de red. Quien ya haya votado será rechazado igualmente por las reglas, que
 * deniegan `update`.
 *
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function hasExistingBallot(uid) {
  try {
    const snapshot = await getDoc(doc(db, 'ballots', uid));
    return snapshot.exists();
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'ballotService - hasExistingBallot',
    });
    return false;
  }
}
