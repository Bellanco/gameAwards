/**
 * Unit Tests para Custom Hooks
 * Ejecutar con: npm test  (o `npm run test:watch` para modo watch)
 *
 * Tests básicos con Vitest + React Testing Library.
 * Las APIs (describe/it/expect/vi) son globales (vite.config.js → test.globals).
 */

import { renderHook } from '@testing-library/react';
import { useFirestoreCategories } from './useFirestoreCategories';
import { useFirestoreBallots } from './useFirestoreBallots';
import { useAdminCheck } from './useAdminCheck';

// Mock de Firebase (db + auth). useAdminCheck usa auth.onAuthStateChanged,
// por eso el mock debe exponer auth con ese método.
vi.mock('../firebase', () => ({
  db: {},
  auth: {
    onAuthStateChanged: vi.fn(() => vi.fn()), // devuelve una función unsubscribe
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}));

vi.mock('../services/errorService', () => ({
  logError: vi.fn(),
  ERROR_TYPES: {
    FIRESTORE_ERROR: 'FIRESTORE_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
}));

describe('Custom Hooks', () => {
  
  describe('useFirestoreCategories', () => {
    it('debe inicializar con estado de carga', () => {
      const { result } = renderHook(() => useFirestoreCategories());
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.categories).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('debe tener función refetch', () => {
      const { result } = renderHook(() => useFirestoreCategories());
      
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('useFirestoreBallots', () => {
    it('debe inicializar con estado de carga', () => {
      const { result } = renderHook(() => useFirestoreBallots());
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.ballots).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('debe tener función refetch', () => {
      const { result } = renderHook(() => useFirestoreBallots());
      
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('useAdminCheck', () => {
    it('debe inicializar con usuario no autenticado', () => {
      const { result } = renderHook(() => useAdminCheck());
      
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });
  });
});
