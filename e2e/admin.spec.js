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

  test('el admin nombra la edición y el archivo se guarda con ese id', async ({ page }) => {
    await signInAsAdmin(page, ADMIN);
    await page.getByRole('button', { name: /^temporada$/i }).click();

    // Nombre propio e identificador distinto del año: es lo que permite tener
    // dos ediciones en el mismo año sin pisarse.
    await page.getByLabel(/^nombre$/i).fill('Porra de verano');
    await page.getByLabel(/identificador/i).fill('2026-verano');
    await page.getByRole('button', { name: /guardar nombre/i }).click();
    await expect(page.getByText(/^guardado$/i)).toBeVisible();

    const config = await readDoc('config', 'voting');
    expect(config.seasonId).toBe('2026-verano');
    expect(config.seasonName).toBe('Porra de verano');

    // Al publicar, el archivo va a results/{seasonId}, no a results/{año}.
    await page.getByRole('button', { name: /actualizar resultados ahora/i }).click();
    await expect(page.getByText(/resultados actualizados/i)).toBeVisible();

    const archivo = await readDoc('results', '2026-verano');
    expect(archivo).not.toBeNull();
    expect(archivo.name).toBe('Porra de verano');
    expect(archivo.season).toBe(2026);
  });

  test('el histórico abre el detalle de una edición y permite renombrarla', async ({ page }) => {
    // Una edición ya archivada, como la dejaría el reinicio anual.
    await seedDoc('results', '2025', {
      season: 2025,
      seasonId: '2025',
      name: 'Porra 2025',
      totalBallots: 2,
      winners: { goty: 'goty_option_0' },
      categoriesSnapshot: [
        {
          id: 'goty',
          title: { es: 'Juego del año', en: 'Game of the year' },
          winner: 'goty_option_0',
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

    await signInAsAdmin(page, ADMIN);
    await page.getByRole('button', { name: /^histórico$/i }).click();

    // La lista muestra la edición; al entrar se ven sus resultados completos.
    await page.getByRole('button', { name: /porra 2025/i }).click();
    await expect(page.getByText(/resultados de la edición: porra 2025/i)).toBeVisible();
    await expect(page.getByText('Clair Obscur')).toBeVisible();
    await expect(page.getByText(/Ana/)).toBeVisible();
    await expect(page.getByText('3 pts')).toBeVisible();

    // Y se puede renombrar (lo único editable de un archivo).
    await page.getByLabel(/^nombre$/i).fill('Porra histórica 2025');
    await page.getByRole('button', { name: /^guardar$/i }).click();
    await expect(page.getByText(/edición renombrada/i)).toBeVisible();

    expect((await readDoc('results', '2025')).name).toBe('Porra histórica 2025');

    // Los ganadores y los puntos siguen intactos: solo cambia el nombre.
    const archivo = await readDoc('results', '2025');
    expect(archivo.winners.goty).toBe('goty_option_0');
    expect(archivo.leaderboard).toHaveLength(2);
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
