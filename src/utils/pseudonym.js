/**
 * Seudónimo estable de un usuario para la clasificación PUBLICADA.
 *
 * `results/{seasonId}` es el documento que ve todo el que puede abrir la
 * pantalla de resultados, y antes llevaba el UID de Firebase de cada
 * participante junto a su nombre. El UID no abre ninguna puerta por sí solo
 * (las reglas siguen exigiendo `request.auth.uid`), pero tampoco hay razón para
 * publicarlo: lo único que necesita la pantalla es poder decir «esta fila eres
 * tú», y para eso basta una huella.
 *
 * Se calcula en el cliente a partir del UID propio y se compara con la del
 * archivo. No hace falta que sea criptográfico —el UID no es adivinable ni
 * enumerable, así que no hay nada que invertir por fuerza bruta—, sí que sea
 * SÍNCRONO: con `crypto.subtle` la pantalla tendría que pintar el ranking en
 * dos pasadas.
 *
 * FNV-1a en dos pasadas con semillas distintas = 64 bits. Con los pocos cientos
 * de participantes que puede tener una porra, la probabilidad de que dos filas
 * colisionen es despreciable.
 */

/** Semillas de las dos pasadas (los dos offset basis habituales de FNV). */
const SEEDS = [0x811c9dc5, 0x01000193];
const PRIME = 0x01000193;

/**
 * @param {string} text
 * @param {number} seed
 * @returns {number} entero de 32 bits sin signo
 */
const fnv1a = (text, seed) => {
  let hash = seed;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, PRIME);
  }
  return hash >>> 0;
};

/**
 * Huella de 16 caracteres hexadecimales de un UID.
 * @param {string|null|undefined} uid
 * @returns {string} huella, o '' si no hay uid
 */
export const hashUid = (uid) => {
  if (!uid) return '';
  const text = String(uid);
  return SEEDS.map((seed) => fnv1a(text, seed).toString(16).padStart(8, '0')).join('');
};

/**
 * ¿Esta entrada de la clasificación es la del usuario dado?
 *
 * Tolera los archivos ANTERIORES a este cambio, que guardaban `userId` en claro:
 * si la entrada no trae huella, se compara el UID tal cual.
 *
 * @param {{uidHash?: string, userId?: string}} entry
 * @param {string|null} uid - UID del usuario actual
 * @returns {boolean}
 */
export const isOwnEntry = (entry, uid) => {
  if (!uid || !entry) return false;
  if (entry.uidHash) return entry.uidHash === hashUid(uid);
  return Boolean(entry.userId) && entry.userId === uid;
};
