/**
 * Densidad visual de la rejilla de nominados.
 *
 * Cuántas columnas caben depende de tres cosas a la vez: el ancho real del
 * viewport, CUÁNTOS nominados hay y cómo se reparten en filas. Con pocas
 * opciones interesan tarjetas grandes; con muchas, que quepan todas sin scroll.
 * La tabla está calibrada a mano por rangos, así que vive aquí como función pura
 * y con tests, en vez de como un bloque de 45 líneas en mitad del render.
 *
 * Los datos reales mandan: las categorías de la edición tienen entre 4 y 6
 * nominados (la mayoría 5), con nombres de hasta ~46 caracteres
 * («Troy Baker: Indiana Jones and the Great Circle»). El reparto está afinado
 * para 4-7 opciones, que es el caso normal, sin dejar de funcionar fuera de ahí.
 */

/**
 * Ancho máximo del contenido de la rejilla.
 *
 * En un monitor ultra-ancho, repartir 2560px entre 5 tarjetas da tarjetas de
 * 500px con un nombre diminuto en el centro: la pantalla crece, pero lo que se
 * lee no mejora. A partir de aquí se centra el contenido en vez de estirarlo.
 */
export const CONTENT_MAX_WIDTH_PX = 1680;

/** Margen lateral que el grid nunca usa (padding del contenedor). */
const SIDE_PADDING_PX = 32;

/** Ancho mínimo de tarjeta y tope de columnas para cada situación. */
const densityFor = ({ width, optionCount, isMobile, isLandscape }) => {
  const isMobilePortrait = isMobile && !isLandscape;

  if (isMobilePortrait) {
    // Evitar saltos bruscos (5 opciones en 2 columnas y 6 en 3) en móviles tipo
    // Pixel: hasta 430px se mantiene un máximo de 2 columnas.
    if (width <= 360) return { minCardWidthPx: 130, maxColumns: 2 };
    if (width <= 430) return { minCardWidthPx: 150, maxColumns: 2 };
    // Móviles grandes y phablets: la tercera columna solo compensa con muchos
    // nominados; con 4 o 5 las tarjetas quedarían más estrechas que el texto.
    if (optionCount >= 6) return { minCardWidthPx: 160, maxColumns: 3 };
    return { minCardWidthPx: 180, maxColumns: 2 };
  }

  if (isMobile && isLandscape) {
    // Apaisado el alto es lo escaso: más columnas para que quepan sin scroll.
    if (optionCount <= 4) return { minCardWidthPx: 165, maxColumns: 4 };
    if (optionCount <= 6) return { minCardWidthPx: 180, maxColumns: 3 };
    return { minCardWidthPx: 165, maxColumns: 4 };
  }

  // Tablet vertical (iPad ~768-834). Dos columnas dejaban tarjetas larguísimas
  // y tres filas de scroll con 6 nominados. La cuarta columna se abre solo a
  // partir de 7 nominados, donde tres dejarían una tarjeta sola en la última
  // fila (3+3+1) y cuatro reparten 4+3.
  if (width < 900) {
    return optionCount >= 7
      ? { minCardWidthPx: 175, maxColumns: 4 }
      : { minCardWidthPx: 205, maxColumns: 3 };
  }

  // Portátiles pequeños y tablets apaisadas.
  if (width < 1280) {
    return optionCount >= 7
      ? { minCardWidthPx: 210, maxColumns: 4 }
      : { minCardWidthPx: 230, maxColumns: 3 };
  }

  // Portátiles y monitores normales.
  if (width < 1600) return { minCardWidthPx: 240, maxColumns: 4 };

  // Monitores grandes: caben 5-6 en una sola fila, que es lo ideal para una
  // categoría de 5 o 6 nominados.
  if (width < 2000) return { minCardWidthPx: 250, maxColumns: 6 };

  return { minCardWidthPx: 280, maxColumns: 7 };
};

/**
 * Reparto de nominados en columnas, evitando filas huérfanas.
 *
 * Entre los repartos que ocupan el MISMO número de filas se queda con el que
 * deja la última fila más llena: con 6 nominados y sitio para 5 columnas, 3+3 se
 * lee mucho mejor que 5+1, y con 7 en sitio para 6, 4+3 mejor que 6+1.
 *
 * @param {number} maxColumns - columnas que caben (por ancho y por calibración)
 * @param {number} optionCount
 * @returns {number}
 */
export const balanceColumns = (maxColumns, optionCount) => {
  const limit = Math.max(1, Math.min(maxColumns, optionCount));

  let best = 1;
  let bestRows = Infinity;
  let bestLastRow = 0;

  for (let columns = 1; columns <= limit; columns += 1) {
    const rows = Math.ceil(optionCount / columns);
    // Cuántas tarjetas quedan en la última fila (una fila exacta = columns).
    const lastRow = optionCount % columns === 0 ? columns : optionCount % columns;

    if (rows < bestRows || (rows === bestRows && lastRow > bestLastRow)) {
      best = columns;
      bestRows = rows;
      bestLastRow = lastRow;
    }
  }

  return best;
};

/**
 * Número de columnas de la rejilla.
 *
 * Nunca más columnas que opciones (una fila a medias queda fea), ni más de las
 * que caben por ancho, ni más que el tope de la calibración; y dentro de eso, el
 * reparto más equilibrado.
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
  const fitting = Math.min(density.maxColumns, columnsByWidth);

  return balanceColumns(fitting, optionCount || 1);
};

/**
 * Ancho aproximado de cada tarjeta con ese reparto.
 *
 * Sirve para decidir la densidad de la tarjeta (texto y alturas) por el espacio
 * que de verdad le toca, no por el número de nominados: 5 opciones en un
 * monitor grande son tarjetas holgadas, y las mismas 5 en una tablet vertical
 * son estrechas.
 *
 * @param {{width: number, columns: number}} params
 * @returns {number} px
 */
export const estimateCardWidth = ({ width, columns }) => {
  const usable = Math.min(
    Math.max(280, (width || 320) - SIDE_PADDING_PX),
    CONTENT_MAX_WIDTH_PX
  );
  return Math.floor(usable / Math.max(1, columns));
};

/**
 * Alto mínimo legible de una tarjeta de nominado, en px.
 *
 * Por debajo de esto el nombre del juego deja de leerse cómodamente (el texto se
 * autoajusta, pero hay un suelo), así que es preferible hacer scroll a seguir
 * comprimiendo. `VoteScreen` compara contra él el alto por fila que sale de
 * `cardHeightFor`.
 */
export const MIN_CARD_HEIGHT_PX = 62;

/**
 * Alto que le toca a cada tarjeta repartiendo el área entre las filas.
 * @param {{areaHeight: number, rows: number, gapPx: number, reservedPx?: number}} params
 * @returns {number} px (0 si no hay medida todavía)
 */
export const cardHeightFor = ({ areaHeight, rows, gapPx, reservedPx = 0 }) => {
  if (!areaHeight || rows < 1) return 0;
  const usable = areaHeight - gapPx * (rows - 1) - reservedPx;
  return Math.floor(usable / rows);
};
