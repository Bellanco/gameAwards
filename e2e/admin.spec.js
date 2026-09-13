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

  test('sin edición en marcha, el panel ofrece abrir una nueva', async ({ page }) => {
    // El login entra por la portada, que necesita la votación abierta; el estado
    // a probar —ninguna edición en marcha, como un proyecto recién estrenado— se
    // siembra después.
    await signInAsAdmin(page, ADMIN);
    await seedDoc('config', 'voting', { season: 2026, isOpen: false });
    await page.reload();
    await page.getByRole('button', { name: /^temporada$/i }).click();

    await expect(page.getByRole('heading', { name: /nueva edición/i })).toBeVisible();

    await page.getByLabel(/^nombre$/i).fill('Porra de verano');
    await page.getByLabel(/se cierra el/i).fill('2026-12-31');
    await page.getByRole('button', { name: /abrir votación/i }).click();
    await expect(page.getByText(/edición abierta/i).first()).toBeVisible();

    const config = await readDoc('config', 'voting');
    expect(config.isOpen).toBe(true);
    expect(config.seasonName).toBe('Porra de verano');
    // El id se deriva del nombre: es la clave del archivo en `results`.
    expect(config.seasonId).toBe('porra-de-verano');
    // La fecha viaja en pareja ISO + epoch; sin el epoch las reglas no podrían
    // cumplir el plazo (no saben parsear una cadena ISO).
    expect(config.closesAt).toBeTruthy();
    expect(config.closesAtMillis).toBe(Date.parse(config.closesAt));
    // Y ya no se piden ni apertura ni fecha de resultados.
    expect(config.opensAtMillis ?? null).toBeNull();
    expect(config.resultsAtMillis ?? null).toBeNull();

    // Abrir una edición NO publica nada todavía.
    expect(await readDoc('results', 'porra-de-verano')).toBeNull();
  });

  test('con la votación abierta, el panel solo ofrece cerrarla', async ({ page }) => {
    await signInAsAdmin(page, ADMIN);
    await page.getByRole('button', { name: /^temporada$/i }).click();

    await expect(page.getByRole('button', { name: /cerrar ahora/i })).toBeVisible();
    // Nada de formularios de apertura ni de publicación mientras se vota.
    await expect(page.getByRole('heading', { name: /nueva edición/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /publicar en el histórico/i })).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /cerrar ahora/i }).click();
    await expect(page.getByText(/votación cerrada/i).first()).toBeVisible();

    const config = await readDoc('config', 'voting');
    expect(config.isOpen).toBe(false);
    // Cerrar no publica: la edición sigue viva, pendiente de ganadores.
    expect(config.lastPublishedId || '').toBe('');
  });

  test('el admin marca un ganador y se guarda fuera del alcance público', async ({ page }) => {
    await signInAsAdmin(page, ADMIN);
    await page.getByRole('button', { name: /seleccionar ganadores/i }).click();

    // Marcar "Hades II" como ganador de Juego del año.
    await page.getByRole('button', { name: 'Hades II' }).click();
    await page.getByRole('button', { name: /guardar ganadores/i }).click();
    await expect(page.getByText(/guardados|guardado/i).first()).toBeVisible();

    // El ganador se guarda por optionId en `admin/winners`, que solo lee un
    // administrador.
    const guardados = await readDoc('admin', 'winners');
    expect(guardados.winners.goty).toBe('goty_option_1');

    // Y NO en la categoría: `categories` es de lectura pública, así que un
    // `winner` ahí sería el resultado de la porra al alcance de cualquiera antes
    // de anunciarlo. Esta aserción es el arreglo entero.
    const categoria = await readDoc('categories', 'goty');
    expect(categoria.winner ?? null).toBeNull();

    // Y guardar ganadores NO publica nada: mientras la edición está viva no
    // existe ningún archivo público que se pueda filtrar. Publicar es el gesto
    // de cerrar la edición desde la pestaña Temporada.
    expect(await readDoc('results', 'porra-2026')).toBeNull();
  });

  test('publicar cierra el ciclo: archivo público, votos borrados y panel listo', async ({ page }) => {
    const ayer = Date.now() - 86_400_000;

    // Se entra con la votación todavía abierta (el login pasa por la portada) y
    // luego se deja el estado a probar: edición cerrada, ganador ya marcado y un
    // voto emitido. Es el momento justo antes de publicar.
    await signInAsAdmin(page, ADMIN);
    await seedDoc(
      'config',
      'voting',
      votingOpen({ isOpen: false, closesAt: new Date(ayer).toISOString(), closesAtMillis: ayer })
    );
    await seedDoc('admin', 'winners', { winners: { goty: 'goty_option_1' } });
    await seedDoc('ballots', 'votante-1', {
      userId: 'votante-1',
      userEmail: 'votante@example.com',
      userNickname: 'Votante',
      userDisplayName: 'Votante',
      selections: { goty: 'goty_option_1' },
      season: 2026,
      submittedAt: new Date(ayer).toISOString(),
      updatedAt: new Date(ayer).toISOString(),
      editCount: 0,
      isActive: true,
    });
    await page.reload();

    await page.getByRole('button', { name: /^temporada$/i }).click();

    // El panel enseña lo que se va a publicar antes de dejarte publicarlo.
    await expect(page.getByRole('heading', { name: /lo que se va a publicar/i })).toBeVisible();
    await expect(page.getByText(/votante/i).first()).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /publicar en el histórico/i }).click();
    await expect(page.getByText(/edición publicada/i).first()).toBeVisible();

    // El archivo queda con `closedAt`, que es lo que las reglas dejan leer sin
    // sesión, y con el ganador resuelto.
    const archivo = await readDoc('results', 'porra-2026');
    expect(archivo.closedAt).toBeTruthy();
    expect(archivo.winners.goty).toBe('goty_option_1');
    expect(archivo.name).toBe('Porra 2026');
    // La clasificación publicada no lleva el UID de nadie, solo su huella.
    expect(archivo.leaderboard).toHaveLength(1);
    expect(archivo.leaderboard[0].userId).toBeUndefined();
    expect(archivo.leaderboard[0].uidHash).toMatch(/^[0-9a-f]{16}$/);
    expect(archivo.leaderboard[0].points).toBe(1);

    // Los votos se borran, que es lo que permite abrir la siguiente edición.
    expect(await readDoc('ballots', 'votante-1')).toBeNull();
    // Y los ganadores de la edición cerrada también.
    expect(await readDoc('admin', 'winners')).toBeNull();

    // La config vuelve al principio del ciclo, apuntando al archivo publicado.
    const config = await readDoc('config', 'voting');
    expect(config.closesAtMillis ?? null).toBeNull();
    expect(config.lastPublishedId).toBe('porra-2026');

    // Y el panel ofrece de nuevo abrir una edición.
    await expect(page.getByRole('heading', { name: /nueva edición/i })).toBeVisible();
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

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /cerrar ahora/i }).click();
    await expect(page.getByText(/votación cerrada/i).first()).toBeVisible();

    expect((await readDoc('config', 'voting')).isOpen).toBe(false);

    // Comprobado desde fuera del panel: la portada ya no deja votar.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /la votación ha cerrado/i })).toBeVisible();
  });
});
