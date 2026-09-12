import { test, expect } from '@playwright/test';
import {
  seedDoc,
  resetEmulators,
  buildCategory,
  votingOpen,
  seasonPublished,
  signInWithGoogle,
} from './helpers.js';

/**
 * Publicación de resultados.
 *
 * La pantalla se alimenta del archivo `results/{seasonId}`, porque los votos no
 * son de lectura pública, y muestra SOLO la última edición cerrada.
 *
 * Dos condiciones la gobiernan, y las dos se cumplen también en servidor
 * (firestore.rules):
 *
 *  1. Que el admin haya PUBLICADO la edición: al archivarla se apunta su id en
 *     `config/voting.lastPublishedId` y el archivo queda con `closedAt`.
 *  2. Que quien mira TENGA SESIÓN: la clasificación lleva el nombre de cada
 *     participante y no debe estar en internet abierto.
 *
 * Mientras hay una edición abierta, votar manda sobre enseñar la anterior.
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

/** El archivo tal cual lo escribe la publicación: con `closedAt`. */
const ARCHIVO = { ...SNAPSHOT, closedAt: new Date().toISOString() };

/**
 * Deja el emulador en un estado concreto del ciclo.
 * @param {{publicada: boolean}} opciones - si la edición ya se publicó
 */
async function sembrarEdicion({ publicada }) {
  await resetEmulators();
  const ayer = Date.now() - 86_400_000;
  await seedDoc(
    'config',
    'voting',
    publicada
      ? seasonPublished('porra-2026')
      : // Cerrada pero SIN publicar: el admin todavía no le ha dado al botón.
        votingOpen({ isOpen: false, closesAt: new Date(ayer).toISOString(), closesAtMillis: ayer })
  );
  const goty = buildCategory('goty', 'Juego del año', ['Clair Obscur', 'Hades II']);
  await seedDoc('categories', goty.id, goty.data);
}

const CURIOSO = { email: 'curioso@example.com', name: 'Curioso' };

test.describe('resultados de la última edición', () => {
  test('sin sesión no se ven: primero hay que entrar', async ({ page }) => {
    // La clasificación lleva nombres de personas. Antes esta pantalla era
    // pública y cualquiera con la URL veía la lista entera.
    await sembrarEdicion({ publicada: true });
    await seedDoc('results', 'porra-2026', ARCHIVO);

    await page.goto('/');

    // El login, pero con el texto de resultados: quien llega aquí no viene a
    // votar, la edición ya terminó.
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByText(/ver los ganadores y la clasificación/i)).toBeVisible();
    await expect(page.getByText('Hades II', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Ana', { exact: true })).toHaveCount(0);
  });

  test('con sesión se ven ganadores y clasificación', async ({ page }) => {
    await sembrarEdicion({ publicada: true });
    await seedDoc('results', 'porra-2026', ARCHIVO);

    await page.goto('/');
    await signInWithGoogle(page, CURIOSO);

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
  });

  test('sin publicar no se enseña nada, aunque el archivo exista', async ({ page }) => {
    // Que el documento exista no basta: hasta que el admin publica, la config no
    // apunta a él y las reglas tampoco dejan leerlo.
    await sembrarEdicion({ publicada: false });
    await seedDoc('results', 'porra-2026', SNAPSHOT);

    await page.goto('/');

    // Ni siquiera pide sesión: no hay nada publicado que enseñar.
    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
    await expect(page.getByText('Hades II', { exact: true })).toHaveCount(0);
  });

  test('publicada pero sin archivo que leer, no se rompe nada', async ({ page }) => {
    await sembrarEdicion({ publicada: true });

    await page.goto('/');
    await signInWithGoogle(page, CURIOSO);

    // Se queda en la pantalla de votación cerrada, sin errores.
    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
  });

  test('una edición abierta manda sobre los resultados ya publicados', async ({ page }) => {
    // Publicada la anterior y abierta una nueva: lo que toca es votar, no
    // quedarse mirando el palmarés del año pasado.
    await resetEmulators();
    await seedDoc('config', 'voting', votingOpen({ lastPublishedId: 'porra-2026' }));
    const goty = buildCategory('goty', 'Juego del año', ['Clair Obscur', 'Hades II']);
    await seedDoc('categories', goty.id, goty.data);
    await seedDoc('results', 'porra-2026', ARCHIVO);

    await page.goto('/');

    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /resultados de la edición/i })).toHaveCount(0);
  });
});
