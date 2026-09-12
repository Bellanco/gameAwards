/**
 * Densidad visual de la rejilla de nominados.
 *
 * Cuántas columnas caben depende de dos cosas a la vez: el ancho real del
 * viewport y CUÁNTOS nominados hay. Con pocas opciones interesan tarjetas
 * grandes; con muchas, que quepan todas sin scroll. La tabla está calibrada a
 * mano por rangos, así que vive aquí como función pura y con tests, en vez de
 * como un bloque de 45 líneas en mitad del render.
 */

/** Ancho mínimo de tarjeta y tope de columnas para cada situación. */
const densityFor = ({ width, optionCount, isMobile, isLandscape }) => {
  const isMobilePortrait = isMobile && !isLandscape;

  if (isMobilePortrait) {
    // Evitar saltos bruscos (5 opciones en 2 columnas y 6 en 3) en móviles tipo
    // Pixel: hasta 430px se mantiene un máximo de 2 columnas.
    if (width <= 430) {
      if (optionCount <= 3) return { minCardWidthPx: 180, maxColumns: 2 };
      return { minCardWidthPx: 150, maxColumns: 2 };
    }
    if (optionCount <= 3) return { minCardWidthPx: 190, maxColumns: 2 };
    if (optionCount <= 6) return { minCardWidthPx: 160, maxColumns: 2 };
    return { minCardWidthPx: 145, maxColumns: 3 };
  }

  if (isMobile && isLandscape) {
    if (optionCount <= 4) return { minCardWidthPx: 170, maxColumns: 4 };
    if (optionCount <= 8) return { minCardWidthPx: 190, maxColumns: 3 };
    return { minCardWidthPx: 170, maxColumns: 4 };
  }

  if (width < 900) {
    return { minCardWidthPx: isMobile ? 200 : 220, maxColumns: 2 };
  }

  if (width < 1280) {
    if (optionCount <= 4) return { minCardWidthPx: 260, maxColumns: 2 };
    if (optionCount <= 8) return { minCardWidthPx: 240, maxColumns: 3 };
    return { minCardWidthPx: 220, maxColumns: 4 };
  }

  if (width < 1600) {
    if (optionCount <= 4) return { minCardWidthPx: 280, maxColumns: 4 };
    if (optionCount <= 8) return { minCardWidthPx: 260, maxColumns: 4 };
    return { minCardWidthPx: 240, maxColumns: 5 };
  }

  if (optionCount <= 4) return { minCardWidthPx: 320, maxColumns: 4 };
  if (optionCount <= 8) return { minCardWidthPx: 290, maxColumns: 5 };
  return { minCardWidthPx: 260, maxColumns: 6 };
};

/**
 * Número de columnas de la rejilla.
 *
 * Nunca más columnas que opciones (una fila a medias queda fea), ni más de las
 * que caben por ancho, ni más que el tope de la calibración.
 *
 * @param {Object} params
 * @param {number} params.width - Ancho del viewport en px
 * @param {number} params.optionCount - Nº de nominados
 * @param {boolean} params.isMobile
 * @param {boolean} params.isLandscape
 * @returns {number} Columnas (>= 1)
 */
export const getGridColumns = ({ width, optionCount, isMobile, isLandscape }) => {
  const safeWidth = Math.max(320, (width || 320) - 24); // margen lateral
  const density = densityFor({
    width: width || 320,
    optionCount,
    isMobile,
    isLandscape,
  });

  const columnsByWidth = Math.max(1, Math.floor(safeWidth / density.minCardWidthPx));

  return Math.max(1, Math.min(optionCount || 1, density.maxColumns, columnsByWidth));
};
