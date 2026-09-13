/**
 * Premios del podio: qué título le toca a cada puesto de la clasificación.
 *
 * Cuando una edición se publica, los cinco primeros de la clasificación reciben
 * un título —una lámina con su nombre— que pueden ver y descargar desde la
 * pantalla de resultados. El arte de cada puesto vive en `templates/` y se
 * publica optimizado en `public/awards/rank-N.jpg` (ver
 * scripts/build-award-cards.mjs); aquí solo está el DÓNDE y el CÓMO se escribe
 * el nombre encima. El dibujo en sí es utils/awardCanvas.js.
 *
 * EL PUESTO NO ES LA POSICIÓN EN LA LISTA. Un empate cuenta como un solo puesto:
 * dos primeros reciben los dos el título de primero y quien les sigue es
 * SEGUNDO, no tercero (ranking denso, ver `assignDenseRanks` en utils/scoring.js).
 * Por eso puede
 * haber más de cinco personas premiadas y, aun así, nunca más de cinco títulos
 * distintos.
 */

/** Puestos con premio: hay una lámina por cada uno y ni una más. */
export const MAX_AWARD_RANK = 5;

/**
 * Configuración de cada lámina.
 *
 * `box` es la ZONA NEGRA donde cabe el nombre, en fracciones del ancho y del
 * alto de la imagen (no en píxeles: las cinco láminas no miden exactamente lo
 * mismo). Está medida sobre el arte real —el hueco que dejan la ola, los logos
 * y el título de cada template—, así que si retocas un template hay que volver
 * a medirla o el nombre se montará encima del dibujo.
 *
 * `color` es el mismo tono del título impreso en la lámina, muestreado de ella.
 */
export const AWARDS = [
  { rank: 1, image: '/awards/rank-1.jpg', color: '#e8cd7e', box: { x: 0.13, y: 0.16, w: 0.61, h: 0.21 } },
  { rank: 2, image: '/awards/rank-2.jpg', color: '#dbdbdd', box: { x: 0.35, y: 0.17, w: 0.50, h: 0.27 } },
  { rank: 3, image: '/awards/rank-3.jpg', color: '#ffbc8b', box: { x: 0.30, y: 0.16, w: 0.65, h: 0.17 } },
  { rank: 4, image: '/awards/rank-4.jpg', color: '#a2aef6', box: { x: 0.03, y: 0.17, w: 0.69, h: 0.20 } },
  { rank: 5, image: '/awards/rank-5.jpg', color: '#fa5b52', box: { x: 0.06, y: 0.21, w: 0.60, h: 0.18 } },
];

/**
 * Lámina que le corresponde a un puesto.
 * @param {number} rank - puesto ya en ranking denso
 * @returns {{rank:number,image:string,color:string,box:Object}|null} null si no hay premio
 */
export const getAward = (rank) =>
  AWARDS.find((award) => award.rank === rank) || null;

/** ¿Este puesto se lleva título? */
export const hasAward = (rank) => Number.isInteger(rank) && rank >= 1 && rank <= MAX_AWARD_RANK;
