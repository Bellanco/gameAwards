/**
 * Tests de los premios del podio.
 * describe/it/expect son globales (vite.config.js -> test.globals).
 */
import { AWARDS, MAX_AWARD_RANK, getAward, hasAward } from './awards';

describe('AWARDS', () => {
  it('tiene una lámina por puesto premiado, del 1 al 5', () => {
    expect(AWARDS).toHaveLength(MAX_AWARD_RANK);
    expect(AWARDS.map((a) => a.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('apunta a láminas publicadas en public/awards', () => {
    // El nombre importa: es lo que genera scripts/build-award-cards.mjs.
    AWARDS.forEach((award) => {
      expect(award.image).toBe(`/awards/rank-${award.rank}.jpg`);
    });
  });

  it('mantiene cada caja de texto DENTRO de la lámina', () => {
    // Una caja que se sale por abajo o por la derecha escribe el nombre fuera
    // del papel: el texto se recorta sin avisar.
    AWARDS.forEach(({ rank, box }) => {
      expect(box.x + box.w, `lámina ${rank}`).toBeLessThanOrEqual(1);
      expect(box.y + box.h, `lámina ${rank}`).toBeLessThanOrEqual(1);
      expect(box.w, `lámina ${rank}`).toBeGreaterThan(0.3);
      expect(box.h, `lámina ${rank}`).toBeGreaterThan(0.1);
    });
  });

  it('deja libre la franja del título impreso en la lámina', () => {
    // El título ("Ganador Game Awards"...) ocupa el 14% superior de cada
    // lámina. Un nombre que empiece más arriba se monta encima.
    AWARDS.forEach(({ rank, box }) => {
      expect(box.y, `lámina ${rank}`).toBeGreaterThanOrEqual(0.14);
    });
  });
});

describe('getAward / hasAward', () => {
  it('resuelve la lámina de cada puesto premiado', () => {
    expect(getAward(1).image).toContain('rank-1');
    expect(getAward(5).color).toBeTruthy();
  });

  it('no premia más allá del quinto puesto', () => {
    expect(getAward(6)).toBeNull();
    expect(hasAward(6)).toBe(false);
    expect(hasAward(5)).toBe(true);
    expect(hasAward(1)).toBe(true);
  });

  it('rechaza puestos imposibles', () => {
    expect(hasAward(0)).toBe(false);
    expect(hasAward(-1)).toBe(false);
    expect(hasAward(null)).toBe(false);
    expect(hasAward(1.5)).toBe(false);
    expect(getAward(undefined)).toBeNull();
  });
});
