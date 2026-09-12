import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { getCategoryTitle as localizeCategoryTitle, getOptionLabel } from '../../utils/localize';
import { LoadingSpinner } from '../ui';

/**
 * Pestaña de histórico: ganadores y clasificación de cada edición publicada en
 * `results/{año}`.
 *
 * Desde que los resultados se publican por fecha (sin esperar al reinicio), aquí
 * también aparece la edición en curso: su documento existe en cuanto el admin
 * guarda el calendario o los ganadores. Se marca como tal para no confundirla
 * con una edición ya cerrada (`closedAt` solo lo escribe el archivado).
 */
export default function HistoryTab({ seasonResults, resultsLoading }) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  return (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-black theme-text-primary">{t('history')}</h2>
            <p className="theme-text-secondary text-sm">{t('historyDescription')}</p>
          </div>

          {resultsLoading ? (
            <LoadingSpinner text={t('loadingData')} />
          ) : seasonResults.length === 0 ? (
            <div className="theme-card theme-border-primary border rounded-lg p-8 text-center">
              <p className="theme-text-secondary">{t('noHistory')}</p>
            </div>
          ) : (
            seasonResults.map(edition => {
              const snap = edition.categoriesSnapshot || [];
              const board = edition.leaderboard || [];
              return (
                <div key={edition.id} className="theme-card theme-border-primary border rounded-lg overflow-hidden">
                  <div className="theme-header theme-border-primary border-b px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black theme-accent">{edition.season}</h3>
                      {!edition.closedAt && (
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded-sm theme-container-secondary theme-text-secondary">
                          {t('inProgressEdition')}
                        </span>
                      )}
                    </div>
                    <span className="text-sm theme-text-secondary">{edition.totalBallots || 0} {t('votes')}</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                    {/* Ganadores por categoría */}
                    <div>
                      <h4 className="text-sm font-bold theme-text-secondary uppercase mb-3">{t('winners')}</h4>
                      <div className="space-y-1.5">
                        {snap.filter(c => c.winner).map(cat => (
                          <div key={cat.id} className="flex justify-between gap-3 text-sm">
                            <span className="theme-text-tertiary truncate">{localizeCategoryTitle(cat, language)}</span>
                            <span className="theme-text-primary font-semibold text-right">{getOptionLabel(cat, cat.winner, language)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Clasificación */}
                    <div>
                      <h4 className="text-sm font-bold theme-text-secondary uppercase mb-3">{t('ranking')}</h4>
                      <div className="space-y-1.5">
                        {board.slice(0, 10).map(entry => (
                          <div key={entry.userId} className="flex justify-between gap-3 text-sm">
                            <span className="theme-text-tertiary">
                              {entry.rank === 1 && '🥇 '}{entry.rank === 2 && '🥈 '}{entry.rank === 3 && '🥉 '}
                              {entry.rank > 3 && `${entry.rank}. `}{entry.nickname}
                            </span>
                            <span className="theme-accent font-bold">{entry.points} {t('pts')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
  );
}
