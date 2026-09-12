import {
  getGridColumns,
  balanceColumns,
  estimateCardWidth,
  cardHeightFor,
  MIN_CARD_HEIGHT_PX,
  CONTENT_MAX_WIDTH_PX,
} from './gridDensity';

const columns = (overrides) =>
  getGridColumns({
    width: 1280,
    optionCount: 5,
    isMobile: false,
    isLandscape: false,
    ...overrides,
  });

describe('getGridColumns', () => {
  it('nunca pone más columnas que nominados', () => {
    // Una fila a medias queda fea: con 2 juegos, 2 columnas como mucho.
    expect(columns({ optionCount: 2, width: 1920 })).toBe(2);
    expect(columns({ optionCount: 1, width: 1920 })).toBe(1);
  });

  it('siempre devuelve al menos una columna', () => {
    expect(columns({ width: 200, optionCount: 10, isMobile: true })).toBeGreaterThanOrEqual(1);
    expect(columns({ width: 0, optionCount: 0 })).toBeGreaterThanOrEqual(1);
  });

  it('en móvil vertical estrecho se queda en 2 columnas como máximo', () => {
    // El salto de 2 a 3 columnas entre 5 y 6 opciones daba un cambio brusco de
    // tamaño en móviles tipo Pixel.
    for (const optionCount of [4, 5, 6, 7, 8]) {
      expect(
        columns({ width: 412, optionCount, isMobile: true, isLandscape: false })
      ).toBeLessThanOrEqual(2);
    }
  });

  it('da tarjetas más grandes cuando hay pocos nominados', () => {
    const pocos = columns({ width: 1920, optionCount: 4 });
    const muchos = columns({ width: 1920, optionCount: 12 });
    expect(pocos).toBeLessThan(muchos);
  });

  it('aprovecha más columnas cuanto más ancha es la pantalla', () => {
    const estrecho = columns({ width: 900, optionCount: 12 });
    const ancho = columns({ width: 1920, optionCount: 12 });
    expect(ancho).toBeGreaterThan(estrecho);
  });

  it('en móvil apaisado prioriza que quepan sin scroll', () => {
    const vertical = columns({ width: 740, optionCount: 8, isMobile: true, isLandscape: false });
    const apaisado = columns({ width: 740, optionCount: 8, isMobile: true, isLandscape: true });
    expect(apaisado).toBeGreaterThanOrEqual(vertical);
  });

  it('tolera un ancho ausente sin romperse', () => {
    expect(getGridColumns({ optionCount: 6, isMobile: true, isLandscape: false })).toBeGreaterThanOrEqual(1);
  });
});

describe('balanceColumns', () => {
  it('evita la fila huérfana repartiendo a partes iguales', () => {
    // 6 nominados con sitio para 5 columnas: 3+3 se lee mucho mejor que 5+1.
    expect(balanceColumns(5, 6)).toBe(3);
    // 7 con sitio para 6: 4+3 mejor que 6+1.
    expect(balanceColumns(6, 7)).toBe(4);
    // 5 con sitio para 4: 3+2 mejor que 4+1.
    expect(balanceColumns(4, 5)).toBe(3);
  });

  it('prefiere siempre menos filas antes que mejor reparto', () => {
    // Si caben todos en una fila, eso gana: ningún reparto en dos filas mejora
    // ver la categoría entera de un vistazo.
    expect(balanceColumns(6, 6)).toBe(6);
    expect(balanceColumns(7, 7)).toBe(7);
    expect(balanceColumns(5, 5)).toBe(5);
  });

  it('nunca devuelve más columnas que nominados', () => {
    expect(balanceColumns(8, 3)).toBe(3);
    expect(balanceColumns(8, 1)).toBe(1);
  });
});

describe('getGridColumns con los tamaños reales de la edición', () => {
  // Las categorías de la edición tienen 4, 5 o 6 nominados; se contempla 7 por
  // si alguna crece. Estos casos fijan el reparto en los tamaños de pantalla
  // habituales para que un retoque de la calibración no los rompa sin querer.
  const cases = [
    // [ancho, móvil, nominados, columnas esperadas]
    [320, true, 5, 2], // iPhone SE
    [390, true, 5, 2], // iPhone 15
    [390, true, 6, 2],
    [412, true, 7, 2], // Pixel
    [768, false, 5, 3], // iPad vertical
    [768, false, 6, 3],
    [1280, false, 5, 3], // portátil
    [1280, false, 6, 3],
    [1280, false, 7, 4],
    [1920, false, 5, 5], // monitor: la categoría entera en una fila
    [1920, false, 6, 6],
    [2560, false, 7, 7],
  ];

  it.each(cases)('%ipx (móvil: %s) con %i nominados -> %i columnas', (width, isMobile, optionCount, expected) => {
    expect(getGridColumns({ width, optionCount, isMobile, isLandscape: false })).toBe(expected);
  });

  it('no deja una tarjeta sola en la última fila en tablet y escritorio', () => {
    // Es donde se ve entera la categoría: un 5+1 o un 6+1 canta mucho. En móvil
    // vertical no siempre se puede evitar (7 nominados en 3 columnas son
    // 3+3+1), y ahí prima hacer menos scroll que cuadrar la última fila.
    for (const width of [768, 834, 900, 1024, 1280, 1440, 1600, 1920, 2560]) {
      for (const optionCount of [5, 6, 7]) {
        const columns = getGridColumns({
          width,
          optionCount,
          isMobile: false,
          isLandscape: false,
        });
        const lastRow = optionCount % columns;
        const isOrphan = lastRow === 1 && columns > 2;
        expect({ width, optionCount, columns, isOrphan }).toEqual({
          width,
          optionCount,
          columns,
          isOrphan: false,
        });
      }
    }
  });
});

describe('estimateCardWidth', () => {
  it('reparte el ancho disponible entre las columnas', () => {
    expect(estimateCardWidth({ width: 1280, columns: 4 })).toBe(312);
  });

  it('no estira las tarjetas más allá del ancho máximo de contenido', () => {
    // En un monitor ultra-ancho, cinco tarjetas de 500px no se leen mejor.
    const ultraWide = estimateCardWidth({ width: 3440, columns: 5 });
    expect(ultraWide).toBe(Math.floor(CONTENT_MAX_WIDTH_PX / 5));
  });
});

describe('cardHeightFor', () => {
  it('reparte el alto descontando separaciones y padding', () => {
    // 300px de área, 3 filas, 12px de gap y 12px de padding inferior:
    // (300 - 24 - 12) / 3 = 88
    expect(cardHeightFor({ areaHeight: 300, rows: 3, gapPx: 12, reservedPx: 12 })).toBe(88);
  });

  it('el alto por fila decide si se puede prescindir del scroll', () => {
    // iPhone SE con 5-6 nominados: 3 filas en el área que queda tras cabecera y
    // pie. La tarjeta sale legible, así que la rejilla reparte y no hay scroll.
    const se = cardHeightFor({ areaHeight: 300, rows: 3, gapPx: 12, reservedPx: 12 });
    expect(se).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT_PX);

    // 7 nominados en 2 columnas (4 filas) en una pantalla muy corta: ni
    // encogiendo se leen, así que ahí sí toca scroll.
    const apretado = cardHeightFor({ areaHeight: 200, rows: 4, gapPx: 12, reservedPx: 12 });
    expect(apretado).toBeLessThan(MIN_CARD_HEIGHT_PX);
  });

  it('sin medida todavía devuelve cero', () => {
    // Primer render: no hay área medida, así que no se decide nada.
    expect(cardHeightFor({ areaHeight: 0, rows: 3, gapPx: 12 })).toBe(0);
  });
});
