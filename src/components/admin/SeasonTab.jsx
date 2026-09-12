import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { getVotingState, areResultsPublished, VOTING_STATE } from '../../utils/votingSchedule';

/** Formato legible de una fecha ISO en el idioma activo. */
const formatDate = (iso, language) =>
  iso ? new Date(iso).toLocaleString(language === 'en' ? 'en-GB' : 'es-ES') : '';

/** Una fila del calendario: etiqueta, input de día y el instante ya guardado. */
function ScheduleField({ label, value, onChange, disabled, savedText }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold theme-text-secondary">
        {label}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full min-h-[44px] px-4 py-2.5 theme-container-secondary theme-border-primary border rounded theme-text-primary focus:outline-none focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        />
      </label>
      <p className="text-xs theme-text-tertiary">{savedText}</p>
    </div>
  );
}

/**
 * Pestaña de temporada: calendario de la edición (apertura, cierre y publicación
 * de resultados), cierre forzado, refresco del snapshot público de resultados y
 * reinicio anual.
 *
 * Toda la lógica vive en `useSeasonControls`; aquí solo hay JSX.
 */
export default function SeasonTab({ config, controls }) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  const { season, isOpen: isVotingOpen, opensAt, closesAt, resultsAt } = config;
  const { days, setDay, applyTestPreset, busy, message, saveSchedule, toggleVoting, publishResults, archiveReset } = controls;

  const state = getVotingState(config);
  const resultsLive = areResultsPublished(config);

  // Texto y color del estado actual: el calendario manda, `isOpen: false` solo
  // puede adelantar el cierre (ver utils/votingSchedule.js).
  const stateLabel = {
    [VOTING_STATE.OPEN]: t('votingOpen'),
    [VOTING_STATE.SCHEDULED]: t('votingScheduled'),
    [VOTING_STATE.CLOSED]: isVotingOpen ? t('votingClosed') : t('forcedClosed'),
  }[state];
  const stateColor = state === VOTING_STATE.OPEN ? 'text-status-success' : 'text-status-error';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-black theme-text-primary">{t('season')}</h2>
        <p className="theme-text-secondary text-sm">{t('seasonDescription')}</p>
      </div>

      {message && (
        <div className="p-3 rounded-lg theme-card theme-border-primary border text-sm theme-text-primary">
          {message}
        </div>
      )}

      {/* Estado de la votación */}
      <div className="theme-card theme-border-primary border rounded-lg p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm theme-text-secondary uppercase mb-1">{t('currentSeason')}</p>
            <p className="text-3xl font-black theme-accent">{season}</p>
            <p className={`text-sm font-semibold mt-1 ${stateColor}`}>{stateLabel}</p>
          </div>
          <button
            onClick={toggleVoting}
            disabled={busy}
            className={`min-h-[44px] py-3 px-6 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${
              isVotingOpen
                ? 'btn-danger border theme-border-primary'
                : 'btn-success border theme-border-primary'
            }`}
          >
            {isVotingOpen ? t('closeVoting') : t('openVoting')}
          </button>
        </div>
      </div>

      {/* Calendario: apertura, cierre y resultados */}
      <div className="theme-card theme-border-primary border rounded-lg p-6">
        <h3 className="text-lg font-bold theme-text-primary mb-2">{t('votingSchedule')}</h3>
        <p className="theme-text-secondary text-sm mb-4">{t('votingScheduleHelp')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ScheduleField
            label={t('opensOnLabel')}
            value={days.opensDay}
            onChange={(value) => setDay('opensDay', value)}
            disabled={busy}
            savedText={opensAt ? `${t('opensOn')} ${formatDate(opensAt, language)}` : t('noOpeningDate')}
          />
          <ScheduleField
            label={t('closesOnLabel')}
            value={days.closesDay}
            onChange={(value) => setDay('closesDay', value)}
            disabled={busy}
            savedText={closesAt ? `${t('closesOn')} ${formatDate(closesAt, language)}` : t('noClosingDate')}
          />
          <ScheduleField
            label={t('resultsOnLabel')}
            value={days.resultsDay}
            onChange={(value) => setDay('resultsDay', value)}
            disabled={busy}
            savedText={resultsAt ? `${t('resultsOn')} ${formatDate(resultsAt, language)}` : t('noResultsDate')}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center mt-5">
          <button
            onClick={saveSchedule}
            disabled={busy}
            className="min-h-[44px] py-2.5 px-5 rounded-lg font-bold text-sm theme-accent-bg theme-text-inverse transition-all disabled:opacity-50"
          >
            {t('saveSchedule')}
          </button>
          <button
            onClick={applyTestPreset}
            disabled={busy}
            className="min-h-[44px] py-2.5 px-5 rounded-lg font-bold text-sm theme-btn-secondary border theme-border-primary transition-all disabled:opacity-50"
          >
            {t('testPreset')}
          </button>
        </div>
        <p className="text-xs theme-text-tertiary mt-3">{t('testPresetHelp')}</p>
      </div>

      {/* Publicación de resultados */}
      <div className="theme-card theme-border-primary border rounded-lg p-6">
        <h3 className="text-lg font-bold theme-text-primary mb-2">{t('resultsPublication')}</h3>
        <p className="theme-text-secondary text-sm mb-4">{t('resultsPublicationHelp')}</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <button
            onClick={publishResults}
            disabled={busy}
            className="min-h-[44px] py-2.5 px-5 rounded-lg font-bold text-sm theme-btn-secondary border theme-border-primary transition-all disabled:opacity-50"
          >
            {t('publishResultsNow')}
          </button>
          <p className={`text-sm font-semibold ${resultsLive ? 'text-status-success' : 'theme-text-tertiary'}`}>
            {resultsLive
              ? t('resultsPublishedAlready')
              : resultsAt
                ? `${t('resultsPendingPublication')} · ${t('resultsOn')} ${formatDate(resultsAt, language)}`
                : t('noResultsDate')}
          </p>
        </div>
      </div>

      {/* Archivar y reiniciar */}
      <div className="bg-status-error-light border border-status-error rounded-lg p-6">
        <h3 className="text-lg font-bold text-status-error mb-2">{t('archiveAndReset')}</h3>
        <p className="theme-text-secondary text-sm mb-4">{t('archiveAndResetDescription')}</p>
        <button
          onClick={archiveReset}
          disabled={busy}
          className="min-h-[44px] py-3 px-6 rounded-lg font-bold text-sm btn-danger border theme-border-primary transition-all disabled:opacity-50"
        >
          {busy ? t('loadingData') : t('archiveAndReset')}
        </button>
      </div>
    </div>
  );
}
