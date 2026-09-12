import React from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { getCategoryTitle, getOptionLabel } from '../utils/localize';
import { ScreenLayout } from './layouts';
import { Header } from './ui';

/**
 * ResultsScreen - Pantalla PÚBLICA de resultados de la edición.
 *
 * Se muestra cuando llega la fecha elegida por el admin (`config/voting.resultsAt`)
 * y sustituye a la pantalla de votación cerrada.
 *
 * Los datos vienen del snapshot público `results/{season}`, NO de `ballots`: los
 * votos solo los puede leer su dueño o un admin, así que la clasificación no se
 * puede calcular en el navegador de un visitante. El snapshot lo escribe
 * `seasonService.publishSeasonResults` cada vez que el admin guarda ganadores o
 * el calendario.
 *
 * @param {Object} props
 * @param {Object} props.result - documento results/{season}
 * @param {string|null} [props.currentUserId] - para resaltar la fila propia
 */
export default function ResultsScreen({ result, currentUserId = null }) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  const categoriesSnapshot = result?.categoriesSnapshot || [];
  const winners = categoriesSnapshot.filter((cat) => cat.winner);
  const leaderboard = result?.leaderboard || [];

  const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`);

  return (
    <ScreenLayout
      header={
        <Header
          title={`${t('publicResultsTitle')} ${result?.season || ''}`.trim()}
          subtitle={t('publicResultsSubtitle')}
        />
      }
      showControlBar={false}
    >
      <div className="relative z-10 w-full max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* Ganadores por categoría */}
        <section>
          <h2 className="text-xl md:text-2xl font-black theme-display uppercase theme-text-primary mb-4">
            {t('winnersByCategory')}
          </h2>
          {winners.length === 0 ? (
            <p className="theme-text-secondary">{t('noWinnersYet')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {winners.map((cat) => (
                <div
                  key={cat.id}
                  className="theme-card theme-border-primary border rounded-xl p-4 flex flex-col gap-1"
                >
                  <span className="text-xs uppercase font-semibold theme-text-tertiary">
                    {getCategoryTitle(cat, language)}
                  </span>
                  <span className="text-lg font-bold theme-accent">
                    {getOptionLabel(cat, cat.winner, language)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Clasificación de participantes */}
        <section>
          <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
            <h2 className="text-xl md:text-2xl font-black theme-display uppercase theme-text-primary">
              {t('ranking')}
            </h2>
            <span className="text-sm theme-text-secondary">
              {leaderboard.length} {t('participants').toLowerCase()}
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="theme-text-secondary">{t('noRankingYet')}</p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((entry) => {
                const isMe = currentUserId && entry.userId === currentUserId;
                return (
                  <li
                    key={entry.userId}
                    className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${
                      isMe
                        ? 'theme-accent-bg theme-text-inverse border-transparent'
                        : 'theme-card theme-border-primary'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="font-bold w-8 text-center shrink-0">{medal(entry.rank)}</span>
                      <span className="font-semibold truncate">{entry.nickname}</span>
                    </span>
                    <span className={`font-black shrink-0 ${isMe ? '' : 'theme-accent'}`}>
                      {entry.points} {t('pts')}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-sm theme-text-secondary text-center">
          © The Game Awards {result?.season || new Date().getFullYear()}
        </p>
      </div>
    </ScreenLayout>
  );
}
