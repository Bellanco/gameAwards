import { test, expect } from '@playwright/test';
import {
  seedDoc,
  readDoc,
  resetEmulators,
  buildCategory,
  votingOpen,
  signInWithGoogle,
  signInAsAdmin,
} from './helpers.js';

/**
 * Panel de administración (/admin).
 *
 * El acceso depende de un custom claim que verifica el servidor (`admin: true`),
 * no de nada que el cliente pueda fingir: lo miran `useAdminCheck` y las reglas
 * de Firestore. Aquí se comprueban las dos caras —quien no lo tiene no entra, y
 * quien lo tiene administra de verdad— y que lo que se guarda desde el panel
 * llega a Firestore con la forma que espera la app pública.
 */

const ADMIN = { email: 'admin@example.com', name: 'Admin E2E' };
const VOTANTE = { email: 'curioso@example.com', name: 'Curioso' };

const CATEGORIAS = [
  buildCategory('goty', 'Juego del año', ['Clair Obscur', 'Hades II'], { orderIndex: 0 }),
  buildCategory('arte', 'Dirección de arte', ['Ghost of Yotei', 'Silksong'], { orderIndex: 1 }),
];

test.describe('panel de administración', () => {
  test.beforeEach(async () => {
    await resetEmulators();
    await seedDoc('config', 'voting', votingOpen());
    for (const categoria of CATEGORIAS) {
      await seedDoc('categories', categoria.id, categoria.data);
    }
  });

  test('un usuario sin el claim de admin no entra en /admin', async ({ page }) => {
    await page.goto('/admin');
    await signInWithGoogle(page, VOTANTE);

    // Sale a la página principal, y sin decirle que la ruta existe: acaba en el
    // flujo público, no en un "no tienes permiso".
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /panel de administración/i })).toHaveCount(0);
  });

  test('un admin ve el panel con sus pestañas', async ({ page }) => {
    await signInAsAdmin(page, ADMIN);

    await expect(page.getByRole('heading', { name: /panel de administración/i })).toBeVisible();
    for (const pestana of [/resumen/i, /categorías/i, /seleccionar ganadores/i, /temporada/i]) {
      await expect(page.getByRole('button', { name: pestana })).toBeVisible();
    }
  });

  test('el admin fija el calendario y queda guardado en config/voting', async ({ page }) => {
    await signInAsAdmin(page, ADMIN);
    await page.getByRole('button', { name: /^temporada$/i }).click();

    // El preset rellena hoy / +7 / +14, que es justo el escenario de prueba.
    await page.getByRole('button', { name: /prueba rápida/i }).click();
    await page.getByRole('button', { name: /guardar calendario/i }).click();
    await expect(page.getByText(/^guardado$/i)).toBeVisible();

    const config = await readDoc('config', 'voting');

    // Cada fecha viaja en pareja ISO + epoch: si se escribiera solo una, el
    // plazo no se cumpliría en las reglas.
    for (const campo of ['opensAt', 'closesAt', 'resultsAt']) {
      expect(config[campo], campo).toBeTruthy();
      expect(config[`${campo}Millis`], `${campo}Millis`).toBe(Date.parse(config[campo]));
    }
    // Y en orden: apertura <= cierre <= resultados.
    expect(config.opensAtMillis).toBeLessThanOrEqual(config.closesAtMillis);
    expect(config.closesAtMillis).toBeLessThanOrEqual(config.resultsAtMillis);

    // Guardar el calendario deja también preparado el snapshot público.
    const snapshot = await readDoc('results', String(config.season));
    expect(snapshot).not.toBeNull();
    expect(snapshot.season).toBe(config.season);
  });

  test('el admin marca un ganador y se publica en el snapshot', async ({ page }) => {
    await signInAsAdmin(page, ADMIN);
    await page.getByRole('button', { name: /seleccionar ganadores/i }).click();

    // Marcar "Hades II" como ganador de Juego del año.
    await page.getByRole('button', { name: 'Hades II' }).click();
    await page.getByRole('button', { name: /guardar ganadores/i }).click();
    await expect(page.getByText(/guardados|guardado/i).first()).toBeVisible();

    // El ganador se guarda por optionId en la categoría...
    const categoria = await readDoc('categories', 'goty');
    expect(categoria.winner).toBe('goty_option_1');

    // ...y el snapshot público se actualiza en el mismo gesto, que es lo que
    // verá la gente cuando llegue la fecha de resultados.
    const snapshot = await readDoc('results', '2026');
    expect(snapshot.winners.goty).toBe('goty_option_1');
  });

  test('el admin cierra la votación y el público deja de poder votar', async ({ page }) => {
    await signInAsAdmin(page, ADMIN);
    await page.getByRole('button', { name: /^temporada$/i }).click();

    await page.getByRole('button', { name: /cerrar ahora/i }).click();
    await expect(page.getByText(/^guardado$/i)).toBeVisible();

    expect((await readDoc('config', 'voting')).isOpen).toBe(false);

    // Comprobado desde fuera del panel: la portada ya no deja votar.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
  });
});
