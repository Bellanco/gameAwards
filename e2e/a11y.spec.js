import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { hashUid } from '../src/utils/pseudonym.js';
import {
  seedDoc,
  resetEmulators,
  buildCategory,
  votingOpen,
  seasonPublished,
  signInWithGoogle,
  getUid,
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

/** Cambia al otro tema y espera a que termine la transición de color. */
async function cambiarTema(page) {
  await page.getByRole('button', { name: /tema|theme/i }).click();
  await page.waitForTimeout(300);
}

/** Repite el análisis en tema claro y oscuro: los colores cambian en cada uno. */
async function analizarAmbosTemas(page) {
  expect(await analizar(page), 'tema por defecto').toEqual([]);

  await cambiarTema(page);
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

  test('premio del podio: propio desplegado y ajeno en su diálogo', async ({ page }) => {
    // El premio mete en la pantalla un `<canvas>` (que para un lector de
    // pantalla es una caja vacía si nadie le pone nombre) y un `<dialog>`, que
    // es justo donde se suele perder el foco. Los dos pasan por axe.
    const ayer = Date.now() - 86_400_000;
    await seedDoc('config', 'voting', seasonPublished('porra-2026'));

    const archivo = (leaderboard) => ({
      season: 2026,
      name: 'Porra TGA 2026',
      closedAt: new Date(ayer).toISOString(),
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

    await seedDoc('results', 'porra-2026', archivo([{ uidHash: 'x', nickname: 'Ana', points: 3 }]));

    await page.goto('/');
    const usuario = { email: 'premiada@example.com', name: 'Premiada' };
    await signInWithGoogle(page, usuario);

    // La huella solo se puede sembrar cuando la cuenta ya existe.
    await seedDoc(
      'results',
      'porra-2026',
      archivo([
        { uidHash: hashUid(await getUid(usuario.email)), nickname: 'Premiada', points: 9 },
        { uidHash: 'otra', nickname: 'Ana', points: 3 },
      ])
    );
    await page.reload();

    await expect(page.getByRole('button', { name: /descargar premio/i })).toBeEnabled();
    await analizarAmbosTemas(page);

    // Con el diálogo abierto NO se puede pulsar el conmutador de tema, y eso es
    // exactamente lo que debe pasar: es modal y deja inerte lo de detrás. Por
    // eso cada tema se analiza abriendo y cerrando el diálogo.
    for (const tema of ['primero', 'alternativo']) {
      await page.getByRole('button', { name: /ver el premio de ana/i }).click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      expect(await analizar(page), `diálogo, tema ${tema}`).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      if (tema === 'primero') await cambiarTema(page);
    }
  });
});
