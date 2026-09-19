import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { useSeasonPreview } from '../../hooks';
import { LoadingSpinner } from '../ui';
import { CloseIcon, TrophyIcon } from '../Icons';

/**
 * PublishDialog - El último gesto de una edición: publicarla.
 *
 * Aparece solo al guardar los ganadores cuando ya están TODOS, que es el momento
 * en el que la edición está de verdad lista. Antes publicar era un viaje aparte
 * a la pestaña Temporada: el mismo trabajo partido en dos pantallas, con la
 * clasificación en una y el botón en la otra.
 *
 * Es un `<dialog>` NATIVO, igual que `AwardDialog`: el foco atrapado dentro, el
 * cierre con Escape y la inercia de lo que queda detrás salen gratis.
 *
 * Y ES LA CONFIRMACIÓN, no un aviso: por eso enseña lo que se va a archivar
 * —cuántos votos, cuántos ganadores y el podio— en vez de preguntar a secas.
 * Los datos los lee de Firestore (`useSeasonPreview`) al abrirse, así que son
 * exactamente los que va a escribir la publicación.
 *
 * @param {Object} props
 * @param {string} props.stage - momento del ciclo (fuerza la relectura al cambiar)
 * @param {string} props.seasonLabel - nombre visible de la edición
 * @param {boolean} props.busy - publicación en curso
 * @param {Function} props.onConfirm - publica de verdad
 * @param {Function} props.onClose
 */
export default function PublishDialog({ stage, seasonLabel, busy, onConfirm, onClose }) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const dialogRef = useRef(null);
  const preview = useSeasonPreview({ stage });

  useEffect(() => {
    // jsdom y los navegadores muy viejos no traen showModal; sin él el diálogo
    // se muestra igual (el atributo `open`), solo que sin modalidad.
    const dialog = dialogRef.current;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute('open', '');
  }, []);

  const podium = preview.leaderboard.slice(0, 3);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="publish-dialog-title"
      // `m-auto`: el reset de Tailwind pone `margin: 0` en todo y eso le quita a
      // <dialog> el centrado que el navegador le da gratis.
      className="m-auto w-[min(92vw,560px)] max-h-[90dvh] overflow-y-auto p-4 md:p-6 rounded-2xl theme-card theme-text-primary theme-border-primary border backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2
            id="publish-dialog-title"
            className="text-xl md:text-2xl font-black theme-text-primary"
          >
            {t('publishReadyTitle')}
          </h2>
          <p className="theme-text-secondary text-sm truncate">{seasonLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t('close')}
          className="shrink-0 min-h-[44px] min-w-[44px] rounded-lg border theme-border-control theme-text-primary flex items-center justify-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-accent)"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {preview.isLoading ? (
        <LoadingSpinner text={t('loadingData')} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <dt className="text-xs uppercase theme-text-tertiary">{t('votes')}</dt>
              <dd className="text-2xl font-black theme-accent">{preview.ballots.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase theme-text-tertiary">{t('winners')}</dt>
              <dd className="text-2xl font-black theme-accent">
                {preview.winnersCount}
                <span className="text-sm theme-text-tertiary">/{preview.categories.length}</span>
              </dd>
            </div>
          </dl>

          {/* El podio que se va a archivar. Con la edición vacía no hay nada que
              enseñar, pero publicar sigue siendo válido. */}
          <section className="mb-5">
            <h3 className="text-sm font-bold theme-text-primary mb-2">{t('publishPreview')}</h3>
            {podium.length === 0 ? (
              <p className="theme-text-secondary text-sm">{t('noRankingYet')}</p>
            ) : (
              <ol className="space-y-2">
                {podium.map((entry) => (
                  <li key={entry.uidHash} className="flex justify-between gap-3 text-sm">
                    <span className="theme-text-secondary truncate flex items-center gap-2">
                      <TrophyIcon className="w-4 h-4 shrink-0" />
                      {entry.rank}. {entry.nickname}
                    </span>
                    <span className="theme-accent font-bold shrink-0">
                      {entry.points} {t('pts')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Publicar es irreversible: lo que implica se dice ANTES del botón. */}
          <p className="text-sm theme-text-secondary mb-5">{t('publishSeasonHelp')}</p>

          {preview.winnersCount < preview.categories.length && (
            <p className="text-sm text-status-error font-semibold mb-5">
              {t('missingWinnersWarning')}
            </p>
          )}

          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={busy}
              className="min-h-[44px] py-3 px-6 rounded-lg font-bold text-sm transition-all disabled:opacity-50 theme-card border theme-border-control theme-text-primary"
            >
              {t('notNow')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="min-h-[44px] py-3 px-6 rounded-lg font-bold text-sm transition-all disabled:opacity-50 btn-danger border theme-border-primary"
            >
              {busy ? t('loadingData') : t('publishSeason')}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
