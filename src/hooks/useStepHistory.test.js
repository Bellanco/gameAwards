import { renderHook, act } from '@testing-library/react';
import { useStepHistory, LOGIN_STEP } from './useStepHistory';

/** Dispara un popstate como haría el botón "atrás" del navegador. */
const goBack = (state) => {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  });
};

describe('useStepHistory', () => {
  let pushState;

  beforeEach(() => {
    pushState = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('empuja una entrada de historial por cada paso del flujo', () => {
    const { rerender } = renderHook(
      ({ step }) => useStepHistory({ currentStep: step, onNavigateBack: vi.fn() }),
      { initialProps: { step: 0 } }
    );

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenLastCalledWith({ step: 0 }, '');

    rerender({ step: 1 });
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(pushState).toHaveBeenLastCalledWith({ step: 1 }, '');
  });

  it('no empuja nada en la pantalla de login', () => {
    renderHook(() =>
      useStepHistory({ currentStep: LOGIN_STEP, onNavigateBack: vi.fn() })
    );

    expect(pushState).not.toHaveBeenCalled();
  });

  it('no duplica la entrada si se vuelve a renderizar con el mismo paso', () => {
    // StrictMode invoca los efectos dos veces en desarrollo: sin esta guarda
    // haría falta pulsar "atrás" dos veces por paso.
    const { rerender } = renderHook(
      ({ step }) => useStepHistory({ currentStep: step, onNavigateBack: vi.fn() }),
      { initialProps: { step: 2 } }
    );

    rerender({ step: 2 });
    rerender({ step: 2 });

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('traduce popstate al paso guardado en la entrada', () => {
    const onNavigateBack = vi.fn();
    renderHook(() => useStepHistory({ currentStep: 3, onNavigateBack }));

    goBack({ step: 2 });

    expect(onNavigateBack).toHaveBeenCalledWith(2);
  });

  it('vuelve al login cuando la entrada no tiene paso', () => {
    // Primera entrada del historial: la que existía antes de empezar a votar.
    const onNavigateBack = vi.fn();
    renderHook(() => useStepHistory({ currentStep: 0, onNavigateBack }));

    goBack(null);

    expect(onNavigateBack).toHaveBeenCalledWith(LOGIN_STEP);
  });

  it('NO empuja una entrada nueva cuando el paso cambia por un "atrás"', () => {
    // Si lo hiciera, el historial crecería en vez de consumirse y "atrás"
    // dejaría de retroceder: el usuario se quedaría atrapado en el flujo.
    const onNavigateBack = vi.fn();
    const { rerender } = renderHook(
      ({ step }) => useStepHistory({ currentStep: step, onNavigateBack }),
      { initialProps: { step: 3 } }
    );
    expect(pushState).toHaveBeenCalledTimes(1);

    goBack({ step: 2 });
    // El padre reacciona al callback cambiando el paso.
    rerender({ step: 2 });

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('sigue empujando con normalidad tras un "atrás"', () => {
    const onNavigateBack = vi.fn();
    const { rerender } = renderHook(
      ({ step }) => useStepHistory({ currentStep: step, onNavigateBack }),
      { initialProps: { step: 3 } }
    );

    goBack({ step: 2 });
    rerender({ step: 2 });
    expect(pushState).toHaveBeenCalledTimes(1);

    // Avanzar de nuevo sí debe crear entrada.
    rerender({ step: 3 });
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(pushState).toHaveBeenLastCalledWith({ step: 3 }, '');
  });

  it('no hace nada si está desactivado (p. ej. en /admin)', () => {
    const onNavigateBack = vi.fn();
    renderHook(() =>
      useStepHistory({ currentStep: 1, onNavigateBack, enabled: false })
    );

    expect(pushState).not.toHaveBeenCalled();

    goBack({ step: 0 });
    expect(onNavigateBack).not.toHaveBeenCalled();
  });

  it('deja de escuchar popstate al desmontarse', () => {
    const onNavigateBack = vi.fn();
    const { unmount } = renderHook(() =>
      useStepHistory({ currentStep: 1, onNavigateBack })
    );

    unmount();
    goBack({ step: 0 });

    expect(onNavigateBack).not.toHaveBeenCalled();
  });
});
