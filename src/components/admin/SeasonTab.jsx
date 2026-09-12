import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';

/**
 * Pestaña de temporada: abrir/cerrar la votación, fijar la fecha de cierre y el
 * reinicio anual (que archiva los resultados y borra todos los votos).
 */
export default function SeasonTab({
  season,
  isVotingOpen,
  closesAt,
  closeDate,
  setCloseDate,
  seasonBusy,
  seasonMessage,
  onToggleVoting,
  onSaveClosingDate,
  onArchiveReset,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  return (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-2xl font-black theme-text-primary">{t('season')}</h2>
            <p className="theme-text-secondary text-sm">{t('seasonDescription')}</p>
          </div>

          {seasonMessage && (
            <div className="p-3 rounded-lg theme-card theme-border-primary border text-sm theme-text-primary">
              {seasonMessage}
            </div>
          )}

          {/* Estado de la votación */}
          <div className="theme-card theme-border-primary border rounded-lg p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm theme-text-secondary uppercase mb-1">{t('currentSeason')}</p>
                <p className="text-3xl font-black theme-accent">{season}</p>
                <p className={`text-sm font-semibold mt-1 ${isVotingOpen ? 'text-status-success' : 'text-status-error'}`}>
                  {isVotingOpen ? t('votingOpen') : t('votingClosed')}
                </p>
              </div>
              <button
                onClick={onToggleVoting}
                disabled={seasonBusy}
                className={`py-3 px-6 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${
                  isVotingOpen
                    ? 'btn-danger border theme-border-primary'
                    : 'btn-success border theme-border-primary'
                }`}
              >
                {isVotingOpen ? t('closeVoting') : t('openVoting')}
              </button>
            </div>
          </div>

          {/* Fecha de cierre (dinámica) */}
          <div className="theme-card theme-border-primary border rounded-lg p-6">
            <h3 className="text-lg font-bold theme-text-primary mb-2">{t('closingDate')}</h3>
            <p className="theme-text-secondary text-sm mb-4">{t('closingDateHelp')}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="date"
                value={closeDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCloseDate(e.target.value)}
                disabled={seasonBusy}
                className="px-4 py-2.5 theme-container-secondary theme-border-primary border rounded theme-text-primary focus:outline-none focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              />
              <button
                onClick={onSaveClosingDate}
                disabled={seasonBusy}
                className="py-2.5 px-5 rounded-lg font-bold text-sm theme-accent-bg theme-text-inverse transition-all disabled:opacity-50"
              >
                {t('save')}
              </button>
            </div>
            <p className="text-sm theme-text-tertiary mt-3">
              {closesAt
                ? `${t('closesOn')}: ${new Date(closesAt).toLocaleString()}`
                : t('noClosingDate')}
            </p>
          </div>

          {/* Archivar y reiniciar */}
          <div className="bg-status-error-light border border-status-error rounded-lg p-6">
            <h3 className="text-lg font-bold text-status-error mb-2">{t('archiveAndReset')}</h3>
            <p className="theme-text-secondary text-sm mb-4">{t('archiveAndResetDescription')}</p>
            <button
              onClick={onArchiveReset}
              disabled={seasonBusy}
              className="py-3 px-6 rounded-lg font-bold text-sm btn-danger border theme-border-primary transition-all disabled:opacity-50"
            >
              {seasonBusy ? t('loadingData') : t('archiveAndReset')}
            </button>
          </div>
        </div>
  );
}
