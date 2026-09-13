import { test, expect } from '@playwright/test';
import {
  seedDoc,
  resetEmulators,
  buildCategory,
  seasonPublished,
  signInWithGoogle,
  getUid,
} from './helpers.js';
import { hashUid } from '../src/utils/pseudonym.js';

/**
 * Premios del podio.
 *
 * Los cinco primeros PUESTOS de la clasificación reciben un título con su
 * nombre. Se dibuja en el navegador sobre la lámina de `public/awards`, así que
 * aquí se comprueba lo único que no puede comprobar un test unitario: que la
 * lámina se sirve, que el canvas se pinta de verdad y que el archivo se
 * descarga.
 *
 * Y sobre todo el EMPATE, que es la regla que reparte los premios: los
 * empatados comparten puesto y todos se llevan ese título, sin que el siguiente
 * clasificado se salte un número.
 */

const CATEGORIA = buildCategory('goty', 'Juego del año', ['Clair Obscur', 'Hades II']);

/** Archivo publicado con la clasificación que se le pase. */
const archivo = (leaderboard) => ({
  season: 2026,
  name: 'Porra TGA 2026',
  closedAt: new Date().toISOString(),
  totalBallots: leaderboard.length,
  winners: { goty: 'goty_option_1' },
  categoriesSnapshot: [
    {
      id: 'goty',
      title: { es: 'Juego del año', en: 'Game of the year' },
      winner: 'goty_option_1',
      weight: 1,
      options: [
        { id: 'goty_option_0', name: 'Clair Obscur' },
        { id: 'goty_option_1', name: 'Hades II' },
      ],
    },
  ],
  leaderboard,
});

/** Edición ya publicada, lista para entrar a ver los resultados. */
async function sembrarPublicada() {
  await resetEmulators();
  await seedDoc('config', 'voting', seasonPublished('porra-2026'));
  await seedDoc('categories', CATEGORIA.id, CATEGORIA.data);
}

const PREMIADO = { email: 'premiado@example.com', name: 'Premiado' };

test.describe('premios del podio', () => {
  test('quien está en el podio ve su premio dibujado y se lo descarga', async ({ page }) => {
    await sembrarPublicada();
    // Antes de saber el UID solo se puede sembrar una clasificación ajena; el
    // archivo definitivo se escribe tras el login, que es cuando lo conocemos.
    await seedDoc('results', 'porra-2026', archivo([{ uidHash: 'x', nickname: 'Otro', points: 1 }]));

    await page.goto('/');
    await signInWithGoogle(page, PREMIADO);
    const uid = await getUid(PREMIADO.email);

    await seedDoc(
      'results',
      'porra-2026',
      archivo([
        { uidHash: hashUid(uid), nickname: 'Diego «Bellanco»', points: 9 },
        { uidHash: 'otro', nickname: 'Ana', points: 4 },
      ])
    );
    await page.reload();

    // El premio propio va desplegado, no detrás de un botón.
    await expect(page.getByRole('heading', { name: /tu premio/i })).toBeVisible();
    const lamina = page.getByRole('img', { name: /primer puesto — Diego «Bellanco»/i });
    await expect(lamina).toBeVisible();

    // El botón se habilita SOLO cuando el canvas está pintado: si la lámina no
    // se sirviera, se quedaría deshabilitado y este test lo cazaría.
    const descargar = page.getByRole('button', { name: /descargar premio/i });
    await expect(descargar).toBeEnabled();

    const descarga = await Promise.all([
      page.waitForEvent('download'),
      descargar.click(),
    ]).then(([evento]) => evento);
    expect(descarga.suggestedFilename()).toBe('porra-tga-2026-1-diego-bellanco.jpg');
  });

  test('un empate da el mismo título a los dos y no salta el puesto siguiente', async ({ page }) => {
    await sembrarPublicada();
    await seedDoc(
      'results',
      'porra-2026',
      archivo([
        // `rank` guardado a la antigua (1, 2, 3): la pantalla lo recalcula.
        { rank: 1, uidHash: 'a', nickname: 'Ana', points: 9 },
        { rank: 2, uidHash: 'b', nickname: 'Beto', points: 9 },
        { rank: 3, uidHash: 'c', nickname: 'Carla', points: 4 },
      ])
    );

    await page.goto('/');
    await signInWithGoogle(page, PREMIADO);

    await expect(page.getByRole('heading', { name: /resultados de la edición/i })).toBeVisible();
    // Dos primeros puestos y ningún tercero: Carla es SEGUNDA. El puesto se
    // comprueba por el texto accesible, no por la medalla (un SVG decorativo).
    await expect(page.getByText(/posición 1/i)).toHaveCount(2);
    await expect(page.getByText(/posición 3/i)).toHaveCount(0);

    // Y el título que recibe Carla es el de segundo puesto, no el de tercero.
    await page.getByRole('button', { name: /ver el premio de carla/i }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: /segundo puesto/i })).toBeVisible();
    await expect(dialogo.getByRole('img', { name: /segundo puesto — Carla/i })).toBeVisible();

    // Escape cierra el diálogo: es un <dialog> nativo, no un div con estilo.
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
  });

  test('fuera del podio no hay premio', async ({ page }) => {
    await sembrarPublicada();
    await seedDoc(
      'results',
      'porra-2026',
      archivo(
        [10, 8, 6, 4, 2, 1].map((points, i) => ({ uidHash: `u${i}`, nickname: `P${i}`, points }))
      )
    );

    await page.goto('/');
    await signInWithGoogle(page, PREMIADO);

    await expect(page.getByRole('button', { name: /ver el premio de p4/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ver el premio de p5/i })).toHaveCount(0);
  });
});
