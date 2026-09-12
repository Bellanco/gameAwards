import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de las pruebas e2e.
 *
 * Corren contra los EMULADORES de Firebase (Auth + Firestore), nunca contra el
 * proyecto real: así se pueden sembrar categorías, votar de verdad y borrarlo
 * todo entre pruebas. Los levanta `npm run test:e2e`; aquí solo se arranca el
 * servidor de Vite apuntando a ellos.
 *
 * El projectId es de mentira a propósito: los emuladores no lo validan y deja
 * claro que ninguna prueba puede tocar los datos de producción.
 */
const E2E_ENV = {
  VITE_USE_EMULATORS: 'true',
  VITE_FIREBASE_API_KEY: 'emulator-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
  VITE_FIREBASE_PROJECT_ID: 'tga-ballot-e2e',
  VITE_FIREBASE_STORAGE_BUCKET: 'tga-ballot-e2e.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '0',
  VITE_FIREBASE_APP_ID: '1:0:web:0',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // comparten emulador: se sembraría uno sobre otro
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // El flujo de votación se rehizo para móviles pequeños: conviene que al
    // menos un recorrido completo se ejecute con ese tamaño. Se usa un perfil
    // de Chromium con el viewport de un iPhone SE y no `devices['iPhone SE']`,
    // que arrastraría WebKit (otra descarga de navegador) sin aportar nada a lo
    // que se prueba aquí.
    {
      name: 'movil',
      use: { ...devices['Pixel 5'], viewport: { width: 320, height: 568 } },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: E2E_ENV,
  },
});
