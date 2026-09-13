import React, { useMemo, useState } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { getCategoryTitle, getOptionLabel } from '../utils/localize';
import { isOwnEntry } from '../utils/pseudonym';
import { assignDenseRanks } from '../utils/scoring';
import { hasAward } from '../utils/awards';
import { ScreenLayout } from './layouts';
import { MedalIcon, TrophyIcon } from './Icons';
import { Header } from './ui';
import AwardCard from './AwardCard';
import AwardDialog from './AwardDialog';

/**
 * ResultsScreen - Pantalla de resultados de la última edición publicada.
 *
 * Se muestra cuando el admin PUBLICA la edición (que es archivarla): el archivo
 * queda en `results/{seasonId}` con su `closedAt` y su id apuntado en
 * `config/voting.lastPublishedId`. Exige sesión, porque la clasificación lleva
 * el nombre de cada participante (misma regla en firestore.rules).
 *
 * Los datos vienen del archivo, NO de `ballots`: los votos solo los puede leer
 * su dueño o un admin, así que la clasificación no se puede calcular en el
 * navegador de un visitante. Lo escribe `seasonService.publishAndArchiveSeason`.
 *
 * La clasificación publicada NO lleva el UID de nadie, solo una huella, así que
 * la fila propia se reconoce con `isOwnEntry` (ver utils/pseudonym.js).
 *
 * PREMIOS DEL PODIO: los cinco primeros puestos se llevan un título con su
 * nombre, que se dibuja aquí mismo en un canvas (ver utils/awardCanvas.js). El
 * puesto se recalcula con `assignDenseRanks` en vez de usar el `rank` guardado:
 * los empatados comparten puesto y reciben todos el mismo título, y así los
 * archivos publicados antes de esta feature quedan bien sin migrarlos.
 *
 * @param {Object} props
 * @param {Object} props.result - documento results/{seasonId}
 * @param {string|null} [props.currentUserId] - para resaltar la fila propia
 */
export default function ResultsScreen({ result, currentUserId = null }) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  // Premio abierto en el diálogo; null = ninguno. El diálogo se monta solo
  // mientras hay uno, que es lo que le permite hacer showModal() al montarse.
  const [openAward, setOpenAward] = useState(null);

  const categoriesSnapshot = result?.categoriesSnapshot || [];
  const winners = categoriesSnapshot.filter((cat) => cat.winner);
  const seasonName = result?.name || '';

  const leaderboard = useMemo(
    () => assignDenseRanks(result?.leaderboard || []),
    [result?.leaderboard]
  );
  const ownEntry = useMemo(
    () => leaderboard.find((entry) => isOwnEntry(entry, currentUserId)) || null,
    [leaderboard, currentUserId]
  );
  const ownAward = ownEntry && hasAward(ownEntry.rank) ? ownEntry : null;

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
      {/*
        En pantallas grandes, ganadores y clasificación van en paralelo: apilados
        obligaban a recorrer 27 categorías antes de llegar al ranking, que es lo
        que la gente viene a mirar. Por debajo de xl se apilan, ganadores primero.
      */}
      <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-8 xl:gap-12 items-start">
        {/*
          El premio propio va ARRIBA DEL TODO y ya dibujado, no detrás de un
          botón: si te ha tocado, es lo primero que has venido a ver. Los demás
          premios se abren desde su fila de la clasificación.
        */}
        {ownAward && (
          <section className="min-w-0 xl:col-span-2">
            <h2 className="text-xl md:text-2xl font-black theme-display uppercase theme-text-primary mb-1">
              {t('yourAwardTitle')}
            </h2>
            <p className="theme-text-secondary mb-4">
              {t('yourAwardSubtitle').replace('{position}', t(`awardTitle${ownAward.rank}`))}
            </p>
            <div className="max-w-3xl mx-auto">
              <AwardCard rank={ownAward.rank} name={ownAward.nickname} seasonName={seasonName} />
            </div>
          </section>
        )}

        {/* Ganadores por categoría */}
        <section className="min-w-0">
          <h2 className="text-xl md:text-2xl font-black theme-display uppercase theme-text-primary mb-4">
            {t('winnersByCategory')}
          </h2>
          {winners.length === 0 ? (
            <p className="theme-text-secondary">{t('noWinnersYet')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
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
        <section className="min-w-0 xl:sticky xl:top-4">
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
                const isMe = isOwnEntry(entry, currentUserId);
                return (
                  <li
                    key={entry.uidHash || entry.userId || `${entry.rank}-${entry.nickname}`}
                    className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${
                      isMe
                        ? 'theme-accent-bg theme-text-inverse border-transparent'
                        : 'theme-card theme-border-primary'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      {/*
                        El puesto se dice SIEMPRE en texto, aunque se vea como
                        medalla: el SVG es `aria-hidden`, así que sin esto un
                        lector de pantalla leería el nombre sin la posición.
                      */}
                      <span className="w-7 shrink-0 flex items-center justify-center">
                        <span className="sr-only">
                          {t('position')} {entry.rank}
                        </span>
                        {entry.rank <= 3 ? (
                          <MedalIcon rank={entry.rank} className="w-7 h-7" />
                        ) : (
                          <span aria-hidden="true" className="font-bold tabular-nums">
                            {entry.rank}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold truncate">{entry.nickname}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`font-black ${isMe ? '' : 'theme-accent'}`}>
                        {entry.points} {t('pts')}
                      </span>
                      {hasAward(entry.rank) && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenAward({ rank: entry.rank, name: entry.nickname })
                          }
                          aria-label={t('viewAwardOf').replace('{name}', entry.nickname)}
                          title={t('viewAward')}
                          className="min-h-[44px] min-w-[44px] rounded-lg border theme-border-control flex items-center justify-center text-lg transition-all hover:-translate-y-0.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-accent)"
                        >
                          <TrophyIcon className="w-5 h-5" />
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-sm theme-text-secondary text-center xl:col-span-2">
          {seasonName || t('officialsVotingPlatform')}
        </p>
      </div>

      {openAward && (
        <AwardDialog
          rank={openAward.rank}
          name={openAward.name}
          seasonName={seasonName}
          onClose={() => setOpenAward(null)}
        />
      )}
    </ScreenLayout>
  );
}
