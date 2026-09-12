import { test, expect } from '@playwright/test';
import {
  seedDoc,
  readDoc,
  resetEmulators,
  buildCategory,
  votingOpen,
  signInWithGoogle,
} from './helpers.js';

/**
 * Recorrido completo de un votante: entrar, votar, revisar, enviar, no poder
 * votar dos veces y poder corregir el voto dentro del plazo.
 *
 * Lo que se comprueba no es solo lo que se ve: tras enviar se lee el documento
 * de `ballots` en el emulador para verificar que las selecciones se guardan por
 * optionId (independientes del idioma) y que el contador de ediciones avanza
 * como exigen las reglas.
 */

const CATEGORIAS = [
  buildCategory('goty', 'Juego del año', ['Clair Obscur', 'Hades II', 'Silksong'], { orderIndex: 0 }),
  buildCategory('arte', 'Dirección de arte', ['Ghost of Yotei', 'Death Stranding 2'], { orderIndex: 1 }),
];

const VOTANTE = { email: 'votante@example.com', name: 'Votante E2E' };

/** Deja la edición abierta con dos categorías y sin votos. */
async function sembrarEdicionAbierta(config = {}) {
  await resetEmulators();
  await seedDoc('config', 'voting', votingOpen(config));
  for (const categoria of CATEGORIAS) {
    await seedDoc('categories', categoria.id, categoria.data);
  }
}

/** Vota la primera opción de cada categoría; la app avanza sola al elegir. */
async function votarTodo(page) {
  await expect(page.getByRole('heading', { name: /juego del año/i })).toBeVisible();
  await page.getByRole('button', { name: 'Clair Obscur' }).click();

  await expect(page.getByRole('heading', { name: /dirección de arte/i })).toBeVisible();
  await page.getByRole('button', { name: 'Ghost of Yotei' }).click();
}

test.describe('votación', () => {
  test.beforeEach(async () => {
    await sembrarEdicionAbierta();
  });

  test('un votante entra, vota, revisa y envía su papeleta', async ({ page }) => {
    await page.goto('/');
    await signInWithGoogle(page, VOTANTE);

    await votarTodo(page);

    // Pantalla de revisión: el nombre viene de la cuenta de Google.
    await expect(page.getByRole('heading', { name: /revisa tus votos/i })).toBeVisible();
    await page.getByRole('button', { name: /enviar papeleta/i }).click();

    await expect(page.getByRole('heading', { name: /papeleta enviada/i })).toBeVisible();

    // Y lo importante: qué se guardó de verdad.
    const usuarios = await readDoc('config', 'voting');
    expect(usuarios.season).toBe(2026);

    const ballots = await fetch(
      'http://127.0.0.1:8080/v1/projects/tga-ballot-e2e/databases/(default)/documents/ballots',
      { headers: { Authorization: 'Bearer owner' } }
    ).then((r) => r.json());

    expect(ballots.documents).toHaveLength(1);
    const uid = ballots.documents[0].name.split('/').pop();
    const ballot = await readDoc('ballots', uid);

    // Las selecciones van por optionId, no por nombre: es lo que hace que el
    // voto no dependa del idioma ni de que se corrija el texto del nominado.
    expect(ballot.selections).toEqual({
      goty: 'goty_option_0',
      arte: 'arte_option_0',
    });
    expect(ballot.userEmail).toBe(VOTANTE.email);
    expect(ballot.season).toBe(2026);
    expect(ballot.editCount).toBe(0);
    expect(ballot.isActive).toBe(true);
  });

  test('al volver a entrar no se puede votar otra vez', async ({ page }) => {
    await page.goto('/');
    await signInWithGoogle(page, VOTANTE);
    await votarTodo(page);
    await page.getByRole('button', { name: /enviar papeleta/i }).click();
    await expect(page.getByRole('heading', { name: /papeleta enviada/i })).toBeVisible();

    // Recargar simula volver a abrir la app con la sesión ya iniciada.
    await page.reload();

    await expect(page.getByRole('heading', { name: /ya has votado/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar papeleta/i })).toHaveCount(0);
  });

  test('el votante puede corregir su voto y el contador avanza', async ({ page }) => {
    await page.goto('/');
    await signInWithGoogle(page, VOTANTE);
    await votarTodo(page);
    await page.getByRole('button', { name: /enviar papeleta/i }).click();
    await expect(page.getByRole('heading', { name: /papeleta enviada/i })).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: /modificar mi voto/i }).click();

    // Se entra por la revisión, con los votos ya cargados.
    await expect(page.getByRole('heading', { name: /revisa tus votos/i })).toBeVisible();
    await page.getByRole('button', { name: /editar votos/i }).click();

    // Cambiar la elección de la primera categoría.
    await expect(page.getByRole('heading', { name: /juego del año/i })).toBeVisible();
    await page.getByRole('button', { name: 'Hades II' }).click();

    await expect(page.getByRole('heading', { name: /dirección de arte/i })).toBeVisible();
    await page.getByRole('button', { name: /finalizar/i }).click();

    await page.getByRole('button', { name: /guardar cambios/i }).click();
    await expect(page.getByRole('heading', { name: /papeleta enviada/i })).toBeVisible();

    const ballots = await fetch(
      'http://127.0.0.1:8080/v1/projects/tga-ballot-e2e/databases/(default)/documents/ballots',
      { headers: { Authorization: 'Bearer owner' } }
    ).then((r) => r.json());
    const uid = ballots.documents[0].name.split('/').pop();
    const ballot = await readDoc('ballots', uid);

    expect(ballot.selections.goty).toBe('goty_option_1'); // Hades II
    expect(ballot.editCount).toBe(1); // una corrección consumida
    expect(ballots.documents).toHaveLength(1); // sigue siendo un voto por persona
  });

  test('fuera de plazo no se puede votar', async ({ page }) => {
    await sembrarEdicionAbierta({
      closesAt: new Date(Date.now() - 60_000).toISOString(),
      closesAtMillis: Date.now() - 60_000,
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toHaveCount(0);
  });

  test('antes de la apertura la edición aparece como programada', async ({ page }) => {
    await sembrarEdicionAbierta({
      opensAt: new Date(Date.now() + 86_400_000).toISOString(),
      opensAtMillis: Date.now() + 86_400_000,
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /aún no ha abierto/i })).toBeVisible();
  });
});
