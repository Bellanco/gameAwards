import { defineConfig } from 'vite';

/**
 * Tests de las reglas de Firestore. Van en su propia configuración porque
 * necesitan el emulador levantado; `npm test` debe seguir siendo rápido y sin
 * dependencias externas.
 *
 * Ejecutar con: npm run test:rules
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.rules.test.js'],
    // El emulador arranca en frío: la primera evaluación de reglas tarda.
    testTimeout: 20000,
    hookTimeout: 30000,
    // Un único hilo: todos los tests comparten la misma instancia de emulador.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
