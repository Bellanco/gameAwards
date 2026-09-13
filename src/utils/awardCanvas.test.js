/**
 * Tests del encaje del nombre en la lámina del premio.
 *
 * La medición se inyecta a propósito: en jsdom `measureText` devuelve siempre 0
 * y cualquier cálculo sobre un canvas real daría verdes falsos. Aquí se simula
 * una fuente de ancho fijo (0,55 em por carácter), que es suficiente para
 * comprobar la lógica: lo que se prueba es el encaje, no la tipografía.
 *
 * describe/it/expect son globales (vite.config.js -> test.globals).
 */
import { wrapText, layoutAwardName } from './awardCanvas';

/** Ancho simulado: 0,55 px por carácter y por px de cuerpo. */
const measureAt = (text, fontSize) => text.length * fontSize * 0.55;

describe('wrapText', () => {
  const measure = (text) => measureAt(text, 10); // 5,5 px por carácter

  it('deja en una línea lo que cabe', () => {
    expect(wrapText(measure, 'Ana Pérez', 1000)).toEqual(['Ana Pérez']);
  });

  it('parte por palabras cuando no cabe', () => {
    // 60 px = 10 caracteres por línea (5,5 px cada uno).
    expect(wrapText(measure, 'Ana Pérez', 60)).toEqual(['Ana Pérez']);
    expect(wrapText(measure, 'Ana Pérez Ruiz', 60)).toEqual(['Ana Pérez', 'Ruiz']);
  });

  it('trocea una palabra que no cabe ni sola', () => {
    // Un nombre sin espacios es legítimo (hasta 50 caracteres) y sin esto se
    // saldría de la lámina en lugar de partirse.
    expect(wrapText(measure, 'Supercalifragilistico', 60)).toEqual([
      'Supercalif',
      'ragilistic',
      'o',
    ]);
  });

  it('no devuelve líneas vacías con espacios de más', () => {
    expect(wrapText(measure, '   Ana    Pérez  ', 1000)).toEqual(['Ana Pérez']);
    expect(wrapText(measure, '', 1000)).toEqual([]);
  });
});

describe('layoutAwardName', () => {
  const box = { width: 1000, height: 200 };

  it('agranda el nombre corto hasta llenar la caja', () => {
    const { fontSize, lines } = layoutAwardName(measureAt, 'Ana', box);
    expect(lines).toEqual(['Ana']);
    // Una línea: el cuerpo lo limita el alto de la caja (200 / 1,18 = 169).
    expect(fontSize).toBeGreaterThan(150);
    expect(fontSize * 1.18).toBeLessThanOrEqual(box.height);
  });

  it('encoge el nombre largo hasta que cabe, sin salirse', () => {
    const name = 'Maximiliano Rodríguez de la Fuente';
    const { fontSize, lines } = layoutAwardName(measureAt, name, box);
    expect(lines.length).toBeLessThanOrEqual(2);
    lines.forEach((line) => {
      expect(measureAt(line, fontSize)).toBeLessThanOrEqual(box.width);
    });
    expect(lines.length * fontSize * 1.18).toBeLessThanOrEqual(box.height);
  });

  it('nunca pasa de dos líneas: un título no es un párrafo', () => {
    const { lines } = layoutAwardName(measureAt, 'A'.repeat(50), box);
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it('el nombre corto sale más grande que el largo', () => {
    const corto = layoutAwardName(measureAt, 'Kiko', box);
    const largo = layoutAwardName(measureAt, 'Maximiliano Rodríguez de la Fuente', box);
    expect(corto.fontSize).toBeGreaterThan(largo.fontSize);
  });

  it('aguanta un nombre vacío sin romperse', () => {
    expect(layoutAwardName(measureAt, '', box).lines).toEqual([]);
    expect(layoutAwardName(measureAt, null, box).lines).toEqual([]);
  });
});
