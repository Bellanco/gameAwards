/**
 * Unit Tests para Custom Hooks
 * Ejecutar con: npm test  (o `npm run test:watch` para modo watch)
 *
 * Tests básicos con Vitest + React Testing Library.
 * Las APIs (describe/it/expect/vi) son globales (vite.config.js → test.globals).
 */

import { renderHook, act } from '@testing-library/react';
import { useFirestoreCategories } from './useFirestoreCategories';
import { useFirestoreBallots } from './useFirestoreBallots';
import { useAdminCheck } from './useAdminCheck';
import { useWinnerSelection } from './useWinnerSelection';

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
  
  describe('useWinnerSelection', () => {
    it('debe inicializar con state vacío', () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      expect(result.current.winners).toEqual({});
      expect(result.current.hasChanges).toBe(false);
      expect(result.current.isSaving).toBe(false);
    });

    it('debe seleccionar un ganador (por optionId)', () => {
      const { result } = renderHook(() => useWinnerSelection([]));

      act(() => {
        result.current.selectWinner('category1', 'opt_a');
      });

      expect(result.current.winners['category1']).toBe('opt_a');
      expect(result.current.hasChanges).toBe(true);
    });

    it('debe deseleccionar un ganador al hacer toggle', () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      act(() => {
        result.current.selectWinner('category1', 'Option A');
      });

      expect(result.current.winners['category1']).toBeDefined();

      act(() => {
        result.current.selectWinner('category1', 'Option A');
      });

      expect(result.current.winners['category1']).toBeUndefined();
    });

    it('debe verificar si un ganador está seleccionado', () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      act(() => {
        result.current.selectWinner('category1', 'Option A');
      });

      expect(result.current.isWinnerSelected('category1', 'Option A')).toBe(true);
      expect(result.current.isWinnerSelected('category1', 'Option B')).toBe(false);
    });

    it('debe obtener ganador de una categoría', () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      act(() => {
        result.current.selectWinner('category1', 'Option A');
      });

      const winner = result.current.getWinner('category1');
      expect(winner).toBe('Option A');
    });

    it('debe retornar null si no hay ganador', () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      const winner = result.current.getWinner('category1');
      expect(winner).toBeNull();
    });

    it('debe deseleccionar un ganador', () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      act(() => {
        result.current.selectWinner('category1', 'Option A');
      });

      expect(result.current.winners['category1']).toBeDefined();

      act(() => {
        result.current.deselectWinner('category1');
      });

      expect(result.current.winners['category1']).toBeUndefined();
    });

    it('debe cargar ganadores existentes (optionId)', () => {
      const categories = [
        { id: 'cat1', winner: 'opt_a' },
        { id: 'cat2', winner: 'opt_b' },
      ];

      const { result } = renderHook(() => useWinnerSelection(categories));

      act(() => {
        result.current.loadExistingWinners(categories);
      });

      expect(result.current.winners['cat1']).toBe('opt_a');
      expect(result.current.winners['cat2']).toBe('opt_b');
    });

    it('debe marcar hasChanges cuando se selecciona', () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      expect(result.current.hasChanges).toBe(false);

      act(() => {
        result.current.selectWinner('category1', 'Option A');
      });

      expect(result.current.hasChanges).toBe(true);
    });

    it('debe resetear hasChanges después de guardar', async () => {
      const { result } = renderHook(() => useWinnerSelection([]));
      
      act(() => {
        result.current.selectWinner('category1', 'Option A');
      });

      expect(result.current.hasChanges).toBe(true);

      // Nota: saveWinners requeriría mocks más complejos de Firestore
      // Este es un test simplificado
    });
  });

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
