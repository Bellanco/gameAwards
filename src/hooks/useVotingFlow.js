/**
 * Hook custom: useVotingFlow
 *
 * Toda la navegación del flujo de votación: en qué paso estamos, qué se ha
 * votado, cómo se persiste el progreso y cómo responde el botón "atrás".
 *
 * El estado sigue siendo único y vive aquí, dentro de `App` (regla 1 del
 * proyecto): este hook solo agrupa lo que ya estaba disperso en App.jsx.
 *
 * Pasos:
 *   -1                       Login
 *   0..n-1                   Votación (una categoría por paso)
 *   n (= validCategories)    Revisión
 *   99                       Éxito
 */

import { useState, useEffect, useCallback } from 'react';
import { useStepHistory } from './useStepHistory';
import logger from '../services/loggerService';

export const LOGIN_STEP = -1;
export const SUCCESS_STEP = 99;

/** Clave de localStorage donde se guarda el progreso a medias. */
const PROGRESS_KEY = 'votingProgress';

/**
 * Lee el progreso guardado. Un valor corrupto (extensión, escritura a medias,
 * cambio de formato) no debe romper el arranque: se descarta y se sigue.
 * @returns {{votes: Object, step: number}|null}
 */
export const readSavedProgress = () => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const progress = JSON.parse(raw);
    return {
      votes: progress?.votes || {},
      step: progress?.step > 0 ? progress.step : 0,
    };
  } catch (error) {
    logger.error('Progreso guardado corrupto, se descarta:', error);
    localStorage.removeItem(PROGRESS_KEY);
    return null;
  }
};

/**
 * @param {Object} params
 * @param {Array} params.validCategories - Categorías que se votan
 * @param {boolean} params.hasSession - Si hay un usuario autenticado
 * @param {boolean} params.historyEnabled - Sincronizar con el historial (solo en '/')
 */
export const useVotingFlow = ({ validCategories, hasSession, historyEnabled = true }) => {
  const [currentStep, setCurrentStep] = useState(LOGIN_STEP);
  // Paso al que volver tras pasar por login al reabrir la app. Se rellena con el
  // progreso guardado, pero NO se aplica a currentStep hasta que el usuario
  // continúa desde la pantalla de login (así la app siempre arranca en login).
  const [resumeStep, setResumeStep] = useState(0);
  const [userVotes, setUserVotes] = useState({});

  const totalSteps = validCategories.length;
  const reviewStep = totalSteps;

  // El botón "atrás" retrocede dentro del flujo en vez de salir de la app.
  useStepHistory({
    currentStep,
    onNavigateBack: setCurrentStep,
    enabled: historyEnabled,
  });

  // Persistencia del progreso.
  useEffect(() => {
    if (currentStep === SUCCESS_STEP) {
      localStorage.removeItem(PROGRESS_KEY);
      return;
    }
    // Solo en pasos reales de votación (>= 0). En la pantalla de login NO se
    // persiste, para no machacar el paso guardado al reabrir.
    if (hasSession && currentStep >= 0 && currentStep <= reviewStep) {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({ votes: userVotes, step: currentStep })
      );
    }
  }, [userVotes, currentStep, hasSession, reviewStep]);

  /** Restaura los votos y el paso recordado desde localStorage. */
  const restoreProgress = useCallback(() => {
    const progress = readSavedProgress();
    if (!progress) return;
    setUserVotes(progress.votes);
    setResumeStep(progress.step);
  }, []);

  /**
   * Carga unos votos ya emitidos para corregirlos (edición del propio voto).
   * Sustituye por completo lo que hubiera en memoria: lo que manda es lo que
   * está guardado en Firestore, no un progreso a medias de otra sesión.
   * @param {Object} votes - { categoryId: { id, name } }
   */
  const loadVotes = useCallback((votes) => setUserVotes(votes || {}), []);

  /** Olvida el progreso guardado y vacía los votos en memoria. */
  const clearProgress = useCallback(() => {
    setUserVotes({});
    setResumeStep(0);
    localStorage.removeItem(PROGRESS_KEY);
  }, []);

  /** Selecciona una opción. option = { id, name } */
  const selectOption = useCallback((categoryId, option) => {
    setUserVotes((prev) => ({ ...prev, [categoryId]: option }));
  }, []);

  /** Categoría anterior, o una concreta si se pasa el índice. */
  const goToPreviousStep = useCallback((stepIndex = null) => {
    if (stepIndex !== null && stepIndex >= 0) {
      setCurrentStep(stepIndex);
      return;
    }
    setCurrentStep((step) => (step > 0 ? step - 1 : step));
  }, []);

  /** Siguiente categoría, o la pantalla de revisión si era la última. */
  const goToNextStep = useCallback(() => {
    setCurrentStep((step) => (step < totalSteps - 1 ? step + 1 : totalSteps));
  }, [totalSteps]);

  /** Salta directamente a la revisión. */
  const finishVoting = useCallback(() => setCurrentStep(reviewStep), [reviewStep]);

  const progressPercentage = (() => {
    if (currentStep < 0 || totalSteps === 0) return 0;
    if (currentStep >= totalSteps) return 100;
    return Math.round(((currentStep + 1) / totalSteps) * 100);
  })();

  return {
    currentStep,
    setCurrentStep,
    resumeStep,
    userVotes,
    selectOption,
    goToPreviousStep,
    goToNextStep,
    finishVoting,
    restoreProgress,
    clearProgress,
    loadVotes,
    progressPercentage,
    reviewStep,
  };
};
