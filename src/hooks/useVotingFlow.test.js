import { renderHook, act } from '@testing-library/react';
import { useVotingFlow, readSavedProgress, LOGIN_STEP, SUCCESS_STEP } from './useVotingFlow';

vi.mock('../services/loggerService', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), critical: vi.fn() },
}));

const categories = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];

const setup = (overrides = {}) =>
  renderHook(() =>
    useVotingFlow({ validCategories: categories, hasSession: true, ...overrides })
  );

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useVotingFlow', () => {
  it('arranca siempre en la pantalla de login', () => {
    const { result } = setup();
    expect(result.current.currentStep).toBe(LOGIN_STEP);
  });

  describe('navegación', () => {
    it('avanza de categoría y termina en la revisión', () => {
      const { result } = setup();

      act(() => result.current.setCurrentStep(0));
      act(() => result.current.goToNextStep());
      expect(result.current.currentStep).toBe(1);

      act(() => result.current.setCurrentStep(2)); // última categoría
      act(() => result.current.goToNextStep());
      expect(result.current.currentStep).toBe(result.current.reviewStep);
    });

    it('retrocede, y no baja del primer paso', () => {
      const { result } = setup();

      act(() => result.current.setCurrentStep(1));
      act(() => result.current.goToPreviousStep());
      expect(result.current.currentStep).toBe(0);

      act(() => result.current.goToPreviousStep());
      expect(result.current.currentStep).toBe(0);
    });

    it('salta a un paso concreto (editar un voto desde la revisión)', () => {
      const { result } = setup();

      act(() => result.current.goToPreviousStep(2));
      expect(result.current.currentStep).toBe(2);
    });

    it('finishVoting va directo a la revisión', () => {
      const { result } = setup();

      act(() => result.current.setCurrentStep(0));
      act(() => result.current.finishVoting());
      expect(result.current.currentStep).toBe(3);
    });
  });

  describe('votos', () => {
    it('guarda la opción elegida por categoría', () => {
      const { result } = setup();

      act(() => result.current.selectOption('c1', { id: 'c1_option_0', name: 'A' }));
      expect(result.current.userVotes.c1).toEqual({ id: 'c1_option_0', name: 'A' });
    });

    it('sustituye el voto al cambiar de opción en la misma categoría', () => {
      const { result } = setup();

      act(() => result.current.selectOption('c1', { id: 'c1_option_0', name: 'A' }));
      act(() => result.current.selectOption('c1', { id: 'c1_option_1', name: 'B' }));

      expect(result.current.userVotes.c1.id).toBe('c1_option_1');
      expect(Object.keys(result.current.userVotes)).toHaveLength(1);
    });
  });

  describe('progreso', () => {
    it('calcula el porcentaje sobre el total de categorías', () => {
      const { result } = setup();

      expect(result.current.progressPercentage).toBe(0); // login
      act(() => result.current.setCurrentStep(0));
      expect(result.current.progressPercentage).toBe(33);
      act(() => result.current.setCurrentStep(2));
      expect(result.current.progressPercentage).toBe(100);
    });

    it('no divide por cero si aún no hay categorías', () => {
      const { result } = renderHook(() =>
        useVotingFlow({ validCategories: [], hasSession: true })
      );
      expect(result.current.progressPercentage).toBe(0);
    });
  });

  describe('persistencia', () => {
    it('guarda el progreso en los pasos de votación', () => {
      const { result } = setup();

      act(() => result.current.setCurrentStep(1));
      act(() => result.current.selectOption('c1', { id: 'c1_option_0', name: 'A' }));

      const saved = JSON.parse(localStorage.getItem('votingProgress'));
      expect(saved.step).toBe(1);
      expect(saved.votes.c1.id).toBe('c1_option_0');
    });

    it('NO guarda en la pantalla de login', () => {
      // Si lo hiciera, al reabrir se machacaría el paso recordado.
      setup();
      expect(localStorage.getItem('votingProgress')).toBeNull();
    });

    it('no guarda nada sin sesión iniciada', () => {
      const { result } = setup({ hasSession: false });

      act(() => result.current.setCurrentStep(1));
      expect(localStorage.getItem('votingProgress')).toBeNull();
    });

    it('limpia el progreso al llegar a la pantalla de éxito', () => {
      const { result } = setup();

      act(() => result.current.setCurrentStep(1));
      expect(localStorage.getItem('votingProgress')).not.toBeNull();

      act(() => result.current.setCurrentStep(SUCCESS_STEP));
      expect(localStorage.getItem('votingProgress')).toBeNull();
    });

    it('restaura los votos y recuerda el paso, sin saltar a él', () => {
      localStorage.setItem(
        'votingProgress',
        JSON.stringify({ votes: { c1: { id: 'c1_option_0' } }, step: 2 })
      );
      const { result } = setup();

      act(() => result.current.restoreProgress());

      expect(result.current.userVotes.c1.id).toBe('c1_option_0');
      expect(result.current.resumeStep).toBe(2);
      // La app siempre arranca en login aunque haya progreso guardado.
      expect(result.current.currentStep).toBe(LOGIN_STEP);
    });

    it('clearProgress vacía votos, paso recordado y localStorage', () => {
      const { result } = setup();
      act(() => result.current.setCurrentStep(1));
      act(() => result.current.selectOption('c1', { id: 'x' }));

      act(() => result.current.clearProgress());

      expect(result.current.userVotes).toEqual({});
      expect(result.current.resumeStep).toBe(0);
    });
  });
});

describe('readSavedProgress', () => {
  beforeEach(() => localStorage.clear());

  it('devuelve null si no hay nada guardado', () => {
    expect(readSavedProgress()).toBeNull();
  });

  it('descarta un progreso corrupto en vez de lanzar', () => {
    // Este era el fallo que dejaba la app colgada en «Cargando».
    localStorage.setItem('votingProgress', '{esto no es json');

    expect(readSavedProgress()).toBeNull();
    expect(localStorage.getItem('votingProgress')).toBeNull();
  });

  it('normaliza un paso negativo o ausente a 0', () => {
    localStorage.setItem('votingProgress', JSON.stringify({ votes: {}, step: -5 }));
    expect(readSavedProgress().step).toBe(0);

    localStorage.setItem('votingProgress', JSON.stringify({ votes: {} }));
    expect(readSavedProgress().step).toBe(0);
  });
});
