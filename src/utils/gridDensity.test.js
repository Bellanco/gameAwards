import { getGridColumns } from './gridDensity';

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
