/**
 * Servicio de papeletas (votos).
 *
 * El UID de Firebase es el ID del documento: eso garantiza un voto por persona.
 * El voto se puede REHACER mientras la votación siga abierta, pero siempre sobre
 * el mismo documento y un número limitado de veces: `editCount` lleva la cuenta
 * (0 en el envío inicial, +1 por corrección) y las reglas exigen que avance de
 * uno en uno sin pasar de `maxBallotEdits()`. El reinicio anual los borra para
 * abrir la siguiente edición.
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
 * @param {Object|null} [params.existingBallot] - Voto anterior, si se está corrigiendo
 * @returns {Object} Documento listo para Firestore
 */
export function buildBallot({ currentUser, userVotes, displayName, season, existingBallot = null }) {
  const selections = {};
  Object.entries(userVotes).forEach(([categoryId, vote]) => {
    selections[categoryId] = vote.id;
  });

  const now = new Date().toISOString();

  return {
    userId: currentUser.uid,
    userEmail: currentUser.email,
    // Nombre de la cuenta de Google (no editable). Se lee de currentUser, nunca
    // de estado, para que no pueda quedar vacío.
    userNickname: sanitizeUserText(currentUser.displayName) || displayName,
    userDisplayName: displayName,
    selections,
    season: Math.trunc(season), // las reglas exigen un entero
    // `submittedAt` es la fecha del PRIMER envío y no se reescribe al corregir
    // (las reglas rechazan el cambio); `updatedAt` es la de esta escritura.
    submittedAt: existingBallot?.submittedAt || now,
    updatedAt: now,
    // Ballots antiguos, anteriores al contador, cuentan como editCount 0.
    editCount: existingBallot ? (existingBallot.editCount || 0) + 1 : 0,
    isActive: true,
  };
}

/**
 * Guarda el voto del usuario. El documento es `ballots/{uid}`.
 *
 * Sirve para el envío inicial y para las correcciones: se escribe siempre el
 * mismo documento (`setDoc`), y son las reglas las que distinguen `create` de
 * `update` y las que cuentan las ediciones.
 *
 * @param {Object} params - Los mismos que `buildBallot`
 * @returns {Promise<{selectionCount: number, editCount: number, ballot: Object}>}
 */
export async function submitBallot(params) {
  try {
    const ballot = buildBallot(params);
    await setDoc(doc(db, 'ballots', params.currentUser.uid), ballot);
    return {
      selectionCount: Object.keys(ballot.selections).length,
      editCount: ballot.editCount,
      ballot,
    };
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'ballotService - submitBallot',
    });
    throw error;
  }
}

/**
 * Voto ya registrado de este usuario, o null si aún no ha votado.
 *
 * Es UNA sola lectura por sesión y de ella sale todo: si ya votó (bloqueo de
 * re-voto), sus selecciones para poder corregirlas y cuántas ediciones le
 * quedan. Antes solo se comprobaba la existencia; traer el documento entero no
 * cuesta ninguna lectura adicional.
 *
 * Ante un error de lectura devuelve `null`: no se bloquea a nadie por un fallo
 * de red. Quien ya haya votado será rechazado igualmente por las reglas.
 *
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function fetchUserBallot(uid) {
  try {
    const snapshot = await getDoc(doc(db, 'ballots', uid));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'ballotService - fetchUserBallot',
    });
    return null;
  }
}
