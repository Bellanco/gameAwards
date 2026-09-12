import { render, screen } from '@testing-library/react';
import AutoSizeText from './AutoSizeText';

/**
 * jsdom no hace layout: scrollWidth/clientWidth valen siempre 0. Se simulan con
 * un modelo sencillo —el ancho del texto es proporcional al tamaño de letra— que
 * basta para comprobar las dos cosas que importan:
 *
 *  1. que elige el mayor tamaño que cabe (corrección), y
 *  2. cuántas MEDICIONES hace para llegar (rendimiento): la búsqueda lineal
 *     anterior hacía un reflow síncrono por píxel, hasta 21 por tarjeta.
 */
const CONTAINER_WIDTH = 120;
const WIDTH_PER_PX_OF_FONT = 10; // ancho del texto = fontSize * 10

let measurements = 0;

const currentFontSize = (element) => parseFloat(element.style.fontSize) || 0;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => CONTAINER_WIDTH,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() {
      measurements += 1;
      return currentFontSize(this) * WIDTH_PER_PX_OF_FONT;
    },
  });
  // La altura nunca limita en este modelo.
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 10_000,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => 0,
  });
});

beforeEach(() => {
  measurements = 0;
});

describe('AutoSizeText', () => {
  it('usa el tamaño máximo cuando el texto ya cabe', () => {
    // A 10px el ancho es 100 y el contenedor mide 120: cabe.
    render(
      <AutoSizeText minSize={4} maxSize={10}>
        GOTY
      </AutoSizeText>
    );

    expect(screen.getByText('GOTY')).toHaveStyle({ fontSize: '10px' });
  });

  it('elige el mayor tamaño que cabe', () => {
    // Cabe mientras fontSize * 10 <= 120 + 2 de margen -> hasta 12px.
    render(
      <AutoSizeText minSize={4} maxSize={30}>
        Elden Ring
      </AutoSizeText>
    );

    expect(screen.getByText('Elden Ring')).toHaveStyle({ fontSize: '12px' });
  });

  it('cae al mínimo cuando no cabe ni al tamaño más pequeño', () => {
    // A 20px (el mínimo) el ancho ya es 200 > 122: nada cabe.
    render(
      <AutoSizeText minSize={20} maxSize={30}>
        Un título larguísimo
      </AutoSizeText>
    );

    expect(screen.getByText('Un título larguísimo')).toHaveStyle({ fontSize: '20px' });
  });

  it('encuentra el tamaño por bisección, no bajando de píxel en píxel', () => {
    // Rango de 9 a 30 px: la búsqueda lineal necesitaba ~20 mediciones.
    render(
      <AutoSizeText minSize={9} maxSize={30}>
        Baldurs Gate 3
      </AutoSizeText>
    );

    expect(screen.getByText('Baldurs Gate 3')).toHaveStyle({ fontSize: '12px' });
    // La bisección sobre 21 valores necesita ~log2(21) ≈ 5 pasos.
    expect(measurements).toBeLessThanOrEqual(8);
  });

  it('no mide más de una vez cuando el texto cabe al máximo', () => {
    render(
      <AutoSizeText minSize={4} maxSize={10}>
        OK
      </AutoSizeText>
    );

    expect(measurements).toBe(1);
  });
});
