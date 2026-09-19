/**
 * Hook custom: useSeasonControls
 *
 * El ciclo de vida de una edición. Son TRES acciones, una por cada momento
 * (ver `SEASON_STAGE`):
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
 * Las tres acciones viven aquí, pero NO en la misma pantalla: abrir y cerrar son
 * la pestaña Temporada, y publicar ocurre donde termina el trabajo —al guardar
 * los ganadores, en su propia pestaña—, porque marcar el último ganador y
 * publicar son el mismo gesto partido en dos. Por eso `publishSeason` ya no pide
 * confirmación con `window.confirm`: lo confirma el diálogo que lo ofrece
 * (`admin/PublishDialog`), que además enseña lo que se va a publicar.
 *
 * Vive en un hook y no en el componente porque son operaciones asíncronas con
 * estado compartido (ocupado + mensaje) y validación previa; `SeasonTab` queda
 * como JSX puro.
 *
 * Las categorías y los votos NO se pasan por parámetro: cada operación los lee
 * de Firestore cuando los necesita. El panel los carga una sola vez al montarse
 * y publicar es irreversible, así que trabajar sobre esa copia significaba
 * archivar lo que hubiera en pantalla en vez de lo que hay en la base de datos.
 *
 * @param {Object} params
 * @param {Object} params.config - config/voting tal cual lo devuelve useVotingConfig
 * @param {Function} params.t - traductor (useTranslation)
 * @param {Function} [params.onPublished] - se llama tras publicar (refrescar histórico)
 * @param {Function} [params.onClosed] - se llama tras cerrar la votación (llevar a Ganadores)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  openSeason as openSeasonService,
  closeSeasonNow,
  publishAndArchiveSeason,
  readLiveEdition,
} from '../services/seasonService';
import { fetchWinners } from '../services/winnersService';
import { todayInVotingZone, addDaysToDay } from '../utils/closingDate';
import { validateClosingDay, getSeasonStage } from '../utils/votingSchedule';
import { getSeasonId, getSeasonLabel } from '../utils/seasonId';
import { computeLeaderboard } from '../utils/scoring';

/** Días por defecto que dura una edición nueva. */
const DEFAULT_DURATION_DAYS = 14;

export const useSeasonControls = ({ config, t, onPublished, onClosed }) => {
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

        const { name, leftovers } = await openSeasonService({
          name: draft.name,
          closesDay: draft.closesDay,
          season,
        });
        // Si había papeletas sueltas de una edición anterior se dice: son datos
        // que desaparecen, y el admin tiene que enterarse por la interfaz y no
        // por la consola.
        const cleaned = leftovers > 0 ? ` · ${t('leftoverBallotsCleared').replace('{count}', leftovers)}` : '';
        return `${t('seasonOpened')}${name ? `: ${name}` : ''}${cleaned}`;
      }),
    [run, draft, season, t]
  );

  /**
   * Adelanta el cierre de la votación. La edición sigue, sin publicar.
   *
   * Al terminar avisa (`onClosed`) para que el panel lleve a Ganadores: lo
   * siguiente que hay que hacer tras cerrar es marcarlos, siempre, y quedarse en
   * Temporada con un aviso solo añadía un clic que nunca cambiaba.
   */
  const closeNow = useCallback(() => {
    // La confirmación va antes de `run` a propósito: cancelar no es un error y
    // no debe pintar nada ni dejar el panel en estado de fallo.
    if (!window.confirm(t('closeNowConfirm'))) return undefined;
    return run(async () => {
      await closeSeasonNow();
      onClosed?.();
      return t('seasonClosed');
    });
  }, [run, t, onClosed]);

  /**
   * Publica la edición en el histórico. Es el paso destructivo: archiva,
   * retira los votos y deja el panel listo para la siguiente.
   *
   * No pregunta nada: quien lo llama es el diálogo de publicación, que ya enseña
   * la edición, los ganadores y la clasificación que se van a archivar. Un
   * `window.confirm` encima sería la segunda confirmación de lo mismo, y de las
   * dos la que menos información da.
   */
  const publishSeason = useCallback(() => {
    return run(async () => {
        // Sin `categories` ni `ballots`: el servicio los lee de Firestore en el
        // momento de publicar. Pasárselos desde aquí era archivar lo que el
        // panel tuviera cargado desde que se abrió la pestaña, que en la
        // segunda edición seguida resultaba ser la clasificación de la primera.
        const result = await publishAndArchiveSeason({
          season,
          seasonId,
          seasonName,
        });
        onPublished?.();
        setDraft({
          name: '',
          closesDay: addDaysToDay(todayInVotingZone(), DEFAULT_DURATION_DAYS),
        });
        return `${t('seasonPublished')}: ${result.name} · ${result.totalBallots} ${t('votes')}`;
    });
  }, [run, season, seasonId, seasonName, t, onPublished]);

  return {
    stage,
    // Nombre visible de la edición: lo usa el diálogo de publicación, que vive
    // en otra pestaña y no recibe el config.
    seasonLabel: getSeasonLabel(config),
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
 * Estado REAL de la edición viva: papeletas, categorías votables, ganadores
 * marcados y la clasificación que saldría de todo ello.
 *
 * Existe porque publicar es irreversible y retira los votos: el admin tiene que
 * poder comprobar ANTES que los ganadores están puestos y que el ranking sale
 * como espera. Antes esto era una pestaña entera («Ranking»), que solo servía
 * para esto y obligaba a ir y volver.
 *
 * LEE DE FIRESTORE, no del estado del AdminPanel. Con los datos del panel —una
 * única carga al montarse— la vista previa enseñaba los votos de la edición
 * anterior y prometía justo lo que luego se archivaba mal. Se recarga al entrar
 * en la pestaña y cada vez que la edición cambia de etapa (abrir, cerrar,
 * publicar), que son los momentos en los que el dato deja de valer.
 *
 * @param {{stage: string, enabled?: boolean}} params
 * @returns {{ballots: Array, categories: Array, winners: Object,
 *            winnersCount: number, leaderboard: Array, isLoading: boolean}}
 */
export const useSeasonPreview = ({ stage, enabled = true }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      return undefined;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const { ballots, categories } = await readLiveEdition();
        const winners = await fetchWinners(categories);
        if (!cancelled) setData({ ballots, categories, winners });
      } catch {
        if (!cancelled) setData({ ballots: [], categories: [], winners: {} });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, stage]);

  const leaderboard = useMemo(
    () => (data ? computeLeaderboard(data.ballots, data.categories, data.winners) : []),
    [data]
  );

  return {
    ballots: data?.ballots || [],
    categories: data?.categories || [],
    winners: data?.winners || {},
    winnersCount: Object.keys(data?.winners || {}).length,
    leaderboard,
    isLoading: enabled && data === null,
  };
};
