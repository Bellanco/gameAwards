import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  seedDoc,
  resetEmulators,
  buildCategory,
  votingOpen,
  seasonPublished,
  signInWithGoogle,
} from './helpers.js';

/**
 * Auditoría automática de accesibilidad (axe) sobre las pantallas reales.
 *
 * Complementa a `src/test/contrast.test.js`, que solo mira los tokens de color:
 * aquí se analiza el DOM ya pintado, con los dos temas, buscando lo que un
 * análisis estático no ve (nombres accesibles, estructura de encabezados,
 * landmarks duplicados, contraste real de cada texto sobre su fondo...).
 *
 * Se exige cero incumplimientos de WCAG 2.1 A y AA.
 */

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const CATEGORIAS = [
  buildCategory('goty', 'Juego del año', ['Clair Obscur', 'Hades II', 'Silksong'], { orderIndex: 0 }),
  buildCategory('arte', 'Dirección de arte', ['Ghost of Yotei', 'Death Stranding 2'], { orderIndex: 1 }),
];

/** Analiza la página y devuelve las violaciones en un formato legible. */
async function analizar(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  return violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    descripcion: v.help,
    elementos: v.nodes.map((n) => n.target.join(' ')),
  }));
}

/** Repite el análisis en tema claro y oscuro: los colores cambian en cada uno. */
async function analizarAmbosTemas(page) {
  expect(await analizar(page), 'tema por defecto').toEqual([]);

  await page.getByRole('button', { name: /tema|theme/i }).click();
  await page.waitForTimeout(300); // la transición de color del tema
  expect(await analizar(page), 'tema alternativo').toEqual([]);
}

test.describe('accesibilidad (axe, WCAG 2.1 AA)', () => {
  test.beforeEach(async () => {
    await resetEmulators();
    await seedDoc('config', 'voting', votingOpen());
    for (const categoria of CATEGORIAS) {
      await seedDoc('categories', categoria.id, categoria.data);
    }
  });

  test('pantalla de inicio de sesión', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await analizarAmbosTemas(page);
  });

  test('pantalla de votación', async ({ page }) => {
    await page.goto('/');
    await signInWithGoogle(page, { email: 'a11y@example.com', name: 'A11y' });
    await expect(page.getByRole('heading', { name: /juego del año/i })).toBeVisible();
    await analizarAmbosTemas(page);
  });

  test('pantalla de revisión', async ({ page }) => {
    await page.goto('/');
    await signInWithGoogle(page, { email: 'a11y@example.com', name: 'A11y' });
    await page.getByRole('button', { name: 'Clair Obscur' }).click();
    await page.getByRole('button', { name: 'Ghost of Yotei' }).click();
    await expect(page.getByRole('heading', { name: /revisa tus votos/i })).toBeVisible();
    await analizarAmbosTemas(page);
  });

  test('pantalla de votación cerrada', async ({ page }) => {
    await seedDoc(
      'config',
      'voting',
      votingOpen({
        isOpen: false,
        closesAt: new Date(Date.now() - 60_000).toISOString(),
        closesAtMillis: Date.now() - 60_000,
      })
    );
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
    await analizarAmbosTemas(page);
  });

  test('pantalla de resultados de la última edición', async ({ page }) => {
    const ayer = Date.now() - 86_400_000;
    await seedDoc(
      'config',
      'voting',
      // Edición ya publicada: sin edición en marcha y apuntando a su archivo.
      seasonPublished('porra-2026')
    );
    await seedDoc('results', 'porra-2026', {
      season: 2026,
      closedAt: new Date(ayer).toISOString(),
      totalBallots: 2,
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
      leaderboard: [
        { rank: 1, userId: 'u1', nickname: 'Ana', points: 3 },
        { rank: 2, userId: 'u2', nickname: 'Bruno', points: 1 },
      ],
    });

    // Los resultados exigen sesión: la clasificación lleva nombres.
    await page.goto('/');
    await signInWithGoogle(page, { email: 'curioso@example.com', name: 'Curioso' });
    await expect(page.getByRole('heading', { name: /resultados de la edición/i })).toBeVisible();
    await analizarAmbosTemas(page);
  });
});
