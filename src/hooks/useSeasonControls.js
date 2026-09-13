/**
 * Hook custom: useSeasonControls
 *
 * El ciclo de vida de una edición, que es todo lo que hace la pestaña Temporada.
 * Son TRES acciones, una por cada momento (ver `SEASON_STAGE`):
 *
 *   sin edición        -> openSeason()      abrir con nombre y fecha de cierre
 *   votación abierta   -> closeNow()        adelantar el cierre
 *   cerrada sin publicar -> publishSeason() archivar, publicar y limpiar
 *
 * Antes esto eran seis operaciones sueltas (calendario de tres fechas, cierre
 * forzado, identidad, publicación y reinicio) repartidas en cinco bloques de
 * formulario. El ciclo real siempre fue este; el panel solo lo enseñaba a
 * trozos.
 *
 * Vive en un hook y no en el componente porque son operaciones asíncronas con
 * estado compartido (ocupado + mensaje) y validación previa; `SeasonTab` queda
 * como JSX puro.
 *
 * @param {Object} params
 * @param {Object} params.config - config/voting tal cual lo devuelve useVotingConfig
 * @param {Array} params.categories - categorías de la edición
 * @param {Array} params.ballots - votos de la temporada
 * @param {Function} params.t - traductor (useTranslation)
 * @param {Function} [params.onPublished] - se llama tras publicar (refrescar histórico)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  openSeason as openSeasonService,
  closeSeasonNow,
  publishAndArchiveSeason,
} from '../services/seasonService';
import { fetchWinners } from '../services/winnersService';
import { todayInVotingZone, addDaysToDay } from '../utils/closingDate';
import { validateClosingDay, getSeasonStage } from '../utils/votingSchedule';
import { getSeasonId } from '../utils/seasonId';
import { computeLeaderboard } from '../utils/scoring';

/** Días por defecto que dura una edición nueva. */
const DEFAULT_DURATION_DAYS = 14;

export const useSeasonControls = ({ config, categories, ballots, t, onPublished }) => {
  const { season, seasonName } = config;
  const seasonId = getSeasonId(config);
  const stage = getSeasonStage(config);

  // Formulario de «nueva edición»: nombre y día de cierre. El día arranca a dos
  // semanas vista para que abrir una edición sea un solo clic si no se toca.
  const [draft, setDraft] = useState(() => ({
    name: '',
    closesDay: addDaysToDay(todayInVotingZone(), DEFAULT_DURATION_DAYS),
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const setDraftField = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Ejecuta una operación gestionando ocupado, confirmación y error.
   * El mensaje de éxito es efímero; el de error se queda hasta el siguiente
   * intento, para que no se escape.
   */
  const run = useCallback(async (operation) => {
    try {
      setBusy(true);
      setError('');
      setMessage('');
      const text = await operation();
      setMessage(text);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  /** Abre una edición nueva: nombre + fecha de cierre, y a votar. */
  const openSeason = useCallback(
    () =>
      run(async () => {
        const errorKey = validateClosingDay(draft.closesDay, todayInVotingZone());
        if (errorKey) throw new Error(t(errorKey));

        const { name } = await openSeasonService({
          name: draft.name,
          closesDay: draft.closesDay,
          season,
        });
        return `${t('seasonOpened')}${name ? `: ${name}` : ''}`;
      }),
    [run, draft, season, t]
  );

  /** Adelanta el cierre de la votación. La edición sigue, sin publicar. */
  const closeNow = useCallback(() => {
    // La confirmación va antes de `run` a propósito: cancelar no es un error y
    // no debe pintar nada ni dejar el panel en estado de fallo.
    if (!window.confirm(t('closeNowConfirm'))) return undefined;
    return run(async () => {
      await closeSeasonNow();
      return t('seasonClosed');
    });
  }, [run, t]);

  /**
   * Publica la edición en el histórico. Es el paso destructivo: archiva,
   * BORRA los votos y deja el panel listo para la siguiente.
   */
  const publishSeason = useCallback(() => {
    if (!window.confirm(`${t('publishSeasonConfirm')} (${seasonName || season})`)) {
      return undefined;
    }
    return run(async () => {
        const result = await publishAndArchiveSeason({
          season,
          seasonId,
          seasonName,
          categories,
          ballots,
        });
        onPublished?.();
        setDraft({
          name: '',
          closesDay: addDaysToDay(todayInVotingZone(), DEFAULT_DURATION_DAYS),
        });
        return `${t('seasonPublished')}: ${result.name} · ${result.deleted} ${t('votes')}`;
    });
  }, [run, season, seasonId, seasonName, categories, ballots, t, onPublished]);

  return {
    stage,
    draft,
    setDraftField,
    busy,
    message,
    error,
    openSeason,
    closeNow,
    publishSeason,
  };
};

/**
 * Vista previa de lo que se va a publicar: ganadores marcados y clasificación
 * en vivo.
 *
 * Existe porque publicar es irreversible y borra los votos: el admin tiene que
 * poder comprobar ANTES que los ganadores están puestos y que el ranking sale
 * como espera. Antes esto era una pestaña entera («Ranking»), que solo servía
 * para esto y obligaba a ir y volver.
 *
 * @param {{categories: Array, ballots: Array, enabled: boolean}} params
 * @returns {{winners: Object, winnersCount: number, leaderboard: Array, isLoading: boolean}}
 */
export const useSeasonPreview = ({ categories, ballots, enabled }) => {
  const [winners, setWinners] = useState(null);

  // Se leen los ganadores guardados (`admin/winners`) al entrar en el paso de
  // publicación.
  useEffect(() => {
    if (!enabled) {
      setWinners(null);
      return undefined;
    }
    let cancelled = false;
    fetchWinners(categories)
      .then((stored) => {
        if (!cancelled) setWinners(stored);
      })
      .catch(() => {
        if (!cancelled) setWinners({});
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, categories]);

  const leaderboard = useMemo(
    () => (winners ? computeLeaderboard(ballots, categories, winners) : []),
    [winners, ballots, categories]
  );

  return {
    winners: winners || {},
    winnersCount: Object.keys(winners || {}).length,
    leaderboard,
    isLoading: enabled && winners === null,
  };
};
