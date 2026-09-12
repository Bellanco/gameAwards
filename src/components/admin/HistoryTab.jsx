import React, { useState } from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { getSeasonLabel } from '../../utils/seasonId';
import { LoadingSpinner } from '../ui';
import HistoryDetail from './HistoryDetail';

/**
 * Pestaña de histórico: las ediciones publicadas (`results/{seasonId}`).
 *
 * Es una LISTA, y al entrar en una edición se abre su detalle completo
 * (`HistoryDetail`). Antes se apilaban todas las ediciones con un resumen de
 * cada una, que con varias ediciones por año se vuelve ilegible.
 *
 * Aquí aparece también la edición en curso: su archivo existe desde que el admin
 * guarda el calendario o los ganadores. Se marca como tal, porque `closedAt`
 * solo lo escribe el archivado del reinicio.
 */
export default function HistoryTab({ seasonResults, resultsLoading, onRefresh }) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const [selectedId, setSelectedId] = useState(null);

  const selected = seasonResults.find((edition) => edition.id === selectedId);

  // El spinner solo en la carga inicial. Si se muestra en cada recarga, un
  // refresco en segundo plano (por ejemplo tras renombrar) desmonta el detalle
  // abierto y devuelve al usuario a la lista, perdiendo el mensaje de
  // confirmación.
  if (resultsLoading && seasonResults.length === 0) {
    return <LoadingSpinner text={t('loadingData')} />;
  }

  if (selected) {
    return (
      <HistoryDetail
        edition={selected}
        onBack={() => setSelectedId(null)}
        onRenamed={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black theme-text-primary">{t('history')}</h2>
        <p className="theme-text-secondary text-sm">{t('historyDescription')}</p>
      </div>

      {seasonResults.length === 0 ? (
        <div className="theme-card theme-border-primary border rounded-lg p-8 text-center">
          <p className="theme-text-secondary">{t('noHistory')}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {seasonResults.map((edition) => {
            const ganadores = (edition.categoriesSnapshot || []).filter((c) => c.winner).length;
            const participantes = (edition.leaderboard || []).length;

            return (
              <li key={edition.id}>
                <button
                  onClick={() => setSelectedId(edition.id)}
                  className="w-full h-full text-left theme-card theme-border-primary border rounded-lg p-5 transition-all hover:theme-border-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xl font-black theme-accent break-words">
                      {getSeasonLabel(edition)}
                    </span>
                    {!edition.closedAt && (
                      <span className="text-xs font-bold uppercase px-2 py-1 rounded theme-container-secondary theme-text-secondary shrink-0">
                        {t('inProgressEdition')}
                      </span>
                    )}
                  </div>

                  <p className="text-sm theme-text-tertiary mb-3">{edition.season}</p>

                  <p className="text-sm theme-text-secondary">
                    {ganadores} {t('winners').toLowerCase()} · {participantes} {t('participantsCount')} ·{' '}
                    {edition.totalBallots || 0} {t('votes')}
                  </p>

                  <span className="inline-block mt-4 text-sm font-bold theme-accent">
                    {t('viewEdition')} →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
