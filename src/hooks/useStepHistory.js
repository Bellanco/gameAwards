/**
 * Hook custom: useStepHistory
 *
 * Hace que el botón "atrás" del navegador retroceda DENTRO del flujo de votación
 * en vez de sacar al usuario de la aplicación.
 *
 * El flujo es estado de React (`currentStep`), no rutas, así que el gesto de
 * retroceso —el reflejo natural en móvil para "volver a la categoría anterior"—
 * abandonaba la app y se perdían las selecciones no persistidas del paso actual.
 * Este hook empuja una entrada de historial por paso y traduce `popstate` de
 * vuelta a un paso.
 *
 * No cambia la URL (`pushState` sin tercer argumento): solo añade entradas al
 * historial de la misma página. Para URLs por paso haría falta un router, que es
 * un cambio mayor con otro coste (ver hallazgo 4.2 de la auditoría).
 *
 * @param {Object} params
 * @param {number} params.currentStep - Paso actual del flujo
 * @param {Function} params.onNavigateBack - Recibe el paso al que volver
 * @param {boolean} [params.enabled=true] - Desactivar en rutas ajenas al flujo
 */

import { useEffect, useRef } from 'react';

/** Paso de la pantalla de login, al que se vuelve desde la primera entrada. */
export const LOGIN_STEP = -1;

export const useStepHistory = ({ currentStep, onNavigateBack, enabled = true }) => {
  const lastPushedStep = useRef(null);
  const isPopNavigation = useRef(false);
  // El callback se guarda en un ref para que el listener se registre UNA vez y
  // no se re-suscriba en cada render del componente padre. La asignación va en
  // su propio efecto y no en el cuerpo del render: escribir un ref mientras se
  // renderiza rompe con render concurrente (React puede descartar ese render).
  const onNavigateBackRef = useRef(onNavigateBack);
  useEffect(() => {
    onNavigateBackRef.current = onNavigateBack;
  }, [onNavigateBack]);

  // Una entrada de historial por paso del flujo.
  useEffect(() => {
    if (!enabled || currentStep < 0) return;

    // Si el cambio de paso VIENE de un "atrás", no se empuja nada: el historial
    // debe consumirse, no crecer, o "atrás" dejaría de retroceder.
    if (isPopNavigation.current) {
      isPopNavigation.current = false;
      lastPushedStep.current = currentStep;
      return;
    }

    // Evita entradas duplicadas para el mismo paso (StrictMode invoca los
    // efectos dos veces en desarrollo, y eso obligaría a pulsar "atrás" dos
    // veces por paso).
    if (lastPushedStep.current === currentStep) return;

    lastPushedStep.current = currentStep;
    window.history.pushState({ step: currentStep }, '');
  }, [currentStep, enabled]);

  // Traducción de popstate a paso.
  useEffect(() => {
    if (!enabled) return;

    const handlePopState = (event) => {
      const step = event.state?.step;
      isPopNavigation.current = true;
      // Sin paso en la entrada estamos en la primera del historial: login.
      onNavigateBackRef.current(typeof step === 'number' ? step : LOGIN_STEP);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [enabled]);
};
