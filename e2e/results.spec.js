import { test, expect } from '@playwright/test';
import { seedDoc, resetEmulators, buildCategory, votingOpen } from './helpers.js';

/**
 * Publicación de resultados.
 *
 * La pantalla es PÚBLICA (no hace falta sesión) y se alimenta del snapshot
 * `results/{season}`, porque los votos no son de lectura pública. Aquí se
 * comprueban las dos condiciones que la gobiernan: que la fecha haya llegado y
 * que el snapshot exista.
 */

const SNAPSHOT = {
  season: 2026,
  totalBallots: 3,
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
    {
      id: 'arte',
      title: { es: 'Dirección de arte', en: 'Art direction' },
      winner: null,
      weight: 1,
      options: [{ id: 'arte_option_0', name: 'Ghost of Yotei' }],
    },
  ],
  leaderboard: [
    { rank: 1, userId: 'u1', nickname: 'Ana', points: 3 },
    { rank: 2, userId: 'u2', nickname: 'Bruno', points: 1 },
    { rank: 3, userId: 'u3', nickname: 'Clara', points: 0 },
  ],
};

/** Edición cerrada, con o sin fecha de resultados ya cumplida. */
async function sembrarEdicionCerrada({ resultsPublicados }) {
  await resetEmulators();
  const ayer = Date.now() - 86_400_000;
  const manana = Date.now() + 86_400_000;
  await seedDoc(
    'config',
    'voting',
    votingOpen({
      isOpen: false,
      closesAt: new Date(ayer).toISOString(),
      closesAtMillis: ayer,
      resultsAt: new Date(resultsPublicados ? ayer : manana).toISOString(),
      resultsAtMillis: resultsPublicados ? ayer : manana,
    })
  );
  const goty = buildCategory('goty', 'Juego del año', ['Clair Obscur', 'Hades II']);
  await seedDoc('categories', goty.id, goty.data);
}

test.describe('resultados públicos', () => {
  test('al llegar la fecha se ven ganadores y clasificación sin iniciar sesión', async ({ page }) => {
    await sembrarEdicionCerrada({ resultsPublicados: true });
    await seedDoc('results', '2026', SNAPSHOT);

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /resultados de la edición 2026/i })).toBeVisible();

    // Ganador por su nombre, resuelto desde el optionId guardado.
    await expect(page.getByText('Hades II', { exact: true })).toBeVisible();
    // La categoría sin ganador no aparece en el listado de ganadores.
    await expect(page.getByText('Dirección de arte', { exact: true })).toHaveCount(0);

    // Clasificación completa y en orden. `exact` porque el subtítulo de la
    // pantalla también habla de ganadores y clasificación.
    const clasificacion = page.getByRole('listitem');
    await expect(clasificacion).toHaveCount(3);
    await expect(clasificacion.first()).toContainText('Ana');
    await expect(clasificacion.first()).toContainText('3 pts');
    await expect(clasificacion.last()).toContainText('Clara');

    // Y nada de pedir sesión.
    await expect(page.getByRole('button', { name: /google/i })).toHaveCount(0);
  });

  test('antes de la fecha no se publica nada, aunque el snapshot exista', async ({ page }) => {
    // El snapshot se escribe en cuanto el admin guarda ganadores o calendario,
    // así que estar publicado no puede depender de que exista: manda la fecha.
    await sembrarEdicionCerrada({ resultsPublicados: false });
    await seedDoc('results', '2026', SNAPSHOT);

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
    await expect(page.getByText('Hades II', { exact: true })).toHaveCount(0);
  });

  test('con la fecha cumplida pero sin snapshot no se rompe nada', async ({ page }) => {
    await sembrarEdicionCerrada({ resultsPublicados: true });

    await page.goto('/');

    // Se queda en la pantalla de votación cerrada, sin errores.
    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
  });
});
