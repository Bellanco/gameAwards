/**
 * Setup global de Vitest
 * Se ejecuta antes de cada archivo de test (config: test.setupFiles)
 * Añade los matchers de jest-dom (toBeInTheDocument, toHaveTextContent, etc.)
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Desmonta los componentes renderizados después de cada test
afterEach(() => {
  cleanup();
});
