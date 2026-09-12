/**
 * Hook custom: useSeasonControls
 *
 * Toda la lógica de la pestaña Temporada del panel de admin: el formulario del
 * calendario (apertura / cierre / resultados), el cierre forzado, la publicación
 * de resultados y el reinicio anual.
 *
 * Vive en un hook y no en el componente porque son cuatro operaciones asíncronas
 * con estado compartido (ocupado + mensaje) y validación previa; en el AdminPanel
 * engordaban un componente que ya rozaba el límite de tamaño. `SeasonTab` queda
 * como JSX puro.
 *
 * @param {Object} params
 * @param {Object} params.config - config/voting tal cual lo devuelve useVotingConfig
 * @param {Array} params.categories - categorías con su `winner`
 * @param {Array} params.ballots - votos de la temporada
 * @param {Function} params.t - traductor (useTranslation)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  setVotingOpen,
  setVotingSchedule,
  setSeasonIdentity,
  publishSeasonResults,
  archiveAndResetSeason,
} from '../services/seasonService';
import {
  toVotingZoneDay,
  todayInVotingZone,
  addDaysToDay,
  dayInstantInVotingZone,
} from '../utils/closingDate';
import { validateScheduleDays } from '../utils/votingSchedule';
import { getSeasonId } from '../utils/seasonId';

/** Días del preset de prueba: se abre hoy, cierra en una semana, resultados en dos. */
const PRESET_OFFSETS = { opens: 0, closes: 7, results: 14 };

const EMPTY_DAYS = { opensDay: '', closesDay: '', resultsDay: '' };

export const useSeasonControls = ({ config, categories, ballots, t }) => {
  const { season, isOpen: isVotingOpen, opensAt, closesAt, resultsAt, seasonName } = config;
  const seasonId = getSeasonId(config);

  const [days, setDays] = useState(EMPTY_DAYS);
  // Identidad de la edición en edición (valga la redundancia): nombre visible e
  // identificador, que es la clave de su archivo en `results`.
  const [identity, setIdentity] = useState({ seasonName: '', seasonId: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Sincronizar el formulario con lo que hay en Firestore. Los días se derivan
  // en Europe/Madrid, no en la hora local del admin: un cierre a las 23:59 de
  // Madrid se mostraría con un día de desfase al administrar desde otro huso.
  useEffect(() => {
    setDays({
      opensDay: toVotingZoneDay(opensAt),
      closesDay: toVotingZoneDay(closesAt),
      resultsDay: toVotingZoneDay(resultsAt),
    });
  }, [opensAt, closesAt, resultsAt]);

  // El formulario de identidad también se sincroniza con lo guardado.
  useEffect(() => {
    setIdentity({ seasonName: seasonName || '', seasonId });
  }, [seasonName, seasonId]);

  /** Mensaje efímero de confirmación (los errores se quedan fijos). */
  const flash = useCallback((text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3500);
  }, []);

  const setDay = useCallback((field, value) => {
    setDays((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setIdentityField = useCallback((field, value) => {
    setIdentity((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Rellena el formulario con el escenario de prueba: hoy / +7 / +14 días.
   * No guarda: deja los campos listos para revisarlos y pulsar Guardar.
   */
  const applyTestPreset = useCallback(() => {
    const today = todayInVotingZone();
    setDays({
      opensDay: today,
      closesDay: addDaysToDay(today, PRESET_OFFSETS.closes),
      resultsDay: addDaysToDay(today, PRESET_OFFSETS.results),
    });
    setMessage('');
  }, []);

  /**
   * Ejecuta una operación asíncrona gestionando ocupado + mensaje de error.
   * @param {Function} operation - devuelve el texto de confirmación
   */
  const run = useCallback(
    async (operation) => {
      try {
        setBusy(true);
        setMessage('');
        const text = await operation();
        flash(text);
      } catch (err) {
        setMessage(err.message);
      } finally {
        setBusy(false);
      }
    },
    [flash]
  );

  /**
   * Guarda el calendario y deja el snapshot de resultados al día.
   *
   * Publicar aquí (además de al guardar ganadores) es lo que hace que "guardar
   * fechas" baste para que los resultados aparezcan solos al llegar el día:
   * `results/{season}` es el único origen público de la clasificación, porque
   * `ballots` no es de lectura pública.
   */
  const saveSchedule = useCallback(
    () =>
      run(async () => {
        const errorKey = validateScheduleDays(days);
        if (errorKey) throw new Error(t(errorKey));

        await setVotingSchedule(days);

        // Programar una apertura FUTURA levanta un cierre forzado anterior: si
        // no, el admin fijaría la fecha y la votación no abriría ese día, sin
        // más pista que el estado del interruptor. Solo con apertura futura:
        // una edición que el admin cerró antes de tiempo no debe reabrirse por
        // editar, por ejemplo, la fecha de resultados.
        const opensInTheFuture =
          dayInstantInVotingZone(days.opensDay, 'start') > Date.now();
        if (!isVotingOpen && opensInTheFuture) {
          await setVotingOpen(true, { season });
        }

        await publishSeasonResults({ season, seasonId, seasonName, categories, ballots });
        return t('saved');
      }),
    [run, days, t, season, seasonId, seasonName, categories, ballots, isVotingOpen]
  );

  /** Cierre forzado / vuelta al calendario. */
  const toggleVoting = useCallback(
    () =>
      run(async () => {
        await setVotingOpen(!isVotingOpen, { season });
        return t('saved');
      }),
    [run, isVotingOpen, season, t]
  );

  /** Regenera el snapshot público de resultados con los ganadores actuales. */
  const publishResults = useCallback(
    () =>
      run(async () => {
        const result = await publishSeasonResults({ season, seasonId, seasonName, categories, ballots });
        return `${t('resultsUpdated')}: ${result.winnersCount} ${t('winners').toLowerCase()} · ${result.totalBallots} ${t('votes')}`;
      }),
    [run, season, seasonId, seasonName, categories, ballots, t]
  );

  /** Guarda el nombre y el identificador de la edición en curso. */
  const saveIdentity = useCallback(
    () =>
      run(async () => {
        const saved = await setSeasonIdentity({ ...identity, season });
        setIdentity({ seasonName: saved.seasonName, seasonId: saved.seasonId });
        return t('saved');
      }),
    [run, identity, season, t]
  );

  /** Archiva la edición, borra los votos y deja la siguiente sin calendario. */
  const archiveReset = useCallback(() => {
    if (!window.confirm(`${t('archiveResetConfirm')} (${season})`)) return undefined;
    return run(async () => {
      const result = await archiveAndResetSeason({ season, seasonId, seasonName, categories, ballots });
      // Nueva edición: cerrada, sin fechas heredadas (el calendario de la
      // anterior cerraría o publicaría la nueva en el momento equivocado).
      await setVotingOpen(false, { season: season + 1 });
      await setVotingSchedule(EMPTY_DAYS);
      // La edición nueva arranca identificada por su año; el admin puede
      // ponerle nombre propio después. Heredar el id anterior haría que la
      // siguiente publicación sobrescribiera el archivo recién guardado.
      await setSeasonIdentity({ season: season + 1, seasonId: String(season + 1), seasonName: '' });
      setDays(EMPTY_DAYS);
      return `${t('archived')}: ${result.deleted} ${t('votes')} · ${result.cleared} ${t('categories').toLowerCase()} · ${season} → ${season + 1}`;
    });
  }, [run, season, seasonId, seasonName, categories, ballots, t]);

  return {
    days,
    setDay,
    identity,
    setIdentityField,
    saveIdentity,
    applyTestPreset,
    busy,
    message,
    saveSchedule,
    toggleVoting,
    publishResults,
    archiveReset,
  };
};
