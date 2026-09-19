import React, { useState } from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { getCategoryTitle, getOptionLabel } from '../../utils/localize';
import { getSeasonLabel } from '../../utils/seasonId';
import { renameSeasonResult, deleteSeasonResult } from '../../services/seasonService';
import logger from '../../services/loggerService';
import { MedalIcon } from '../Icons';

/**
 * Detalle de una edición archivada: sus ganadores y su clasificación completos.
 *
 * La lista del histórico solo enseña un resumen; aquí se ve todo, que es lo que
 * se busca al entrar en una edición concreta.
 *
 * Del archivo solo se puede cambiar el NOMBRE o BORRARLO entero. Los ganadores y
 * los puntos son el resultado histórico y no se pueden recalcular: los votos de
 * esa edición se retiraron al publicarla, así que editarlos dejaría el archivo
 * incoherente. Borrar, en cambio, sí se puede: es lo que permite quitar del
 * histórico las ediciones de prueba (ver `deleteSeasonResult`).
 */
export default function HistoryDetail({ edition, onBack, onRenamed, onDeleted }) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  const [name, setName] = useState(getSeasonLabel(edition));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const winners = (edition.categoriesSnapshot || []).filter((cat) => cat.winner);
  const leaderboard = edition.leaderboard || [];

  /**
   * Borra la edición del histórico. Se pregunta con su nombre delante: son dos
   * clics desde una lista donde todas las tarjetas se parecen, y lo que se va no
   * se puede recuperar.
   */
  const handleDelete = async () => {
    if (!window.confirm(`${t('deleteEditionConfirm')} (${getSeasonLabel(edition)})`)) return;
    try {
      setBusy(true);
      setMessage('');
      await deleteSeasonResult(edition.id);
      // Se vuelve a la lista: la pantalla que se está mirando ya no existe.
      await onDeleted?.();
    } catch (error) {
      logger.error('Error al borrar la edición:', error);
      setMessage(error.message);
      setBusy(false);
    }
  };

  const handleRename = async () => {
    try {
      setBusy(true);
      setMessage('');
      await renameSeasonResult(edition.id, name);
      setMessage(t('editionRenamed'));
      await onRenamed?.();
    } catch (error) {
      logger.error('Error al renombrar la edición:', error);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="min-h-[44px] py-2 px-4 rounded-lg font-semibold text-sm theme-btn-secondary border theme-border-control transition-all"
        >
          ← {t('backToHistory')}
        </button>
        <span className="text-sm theme-text-secondary">
          {edition.totalBallots || 0} {t('votes')} · {leaderboard.length} {t('participantsCount')}
        </span>
      </div>

      <div>
        <h2 className="text-2xl font-black theme-text-primary">
          {t('editionResults')}: {getSeasonLabel(edition)}
        </h2>
        <p className="theme-text-secondary text-sm">
          {edition.season}
        </p>
      </div>

      {/* Renombrar (lo único editable de un archivo) */}
      <div className="theme-card theme-border-primary border rounded-lg p-6">
        <h3 className="text-lg font-bold theme-text-primary mb-3">{t('renameEdition')}</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            maxLength={60}
            aria-label={t('seasonNameLabel')}
            className="flex-1 min-h-[44px] px-4 py-2.5 theme-container-secondary theme-border-control border rounded theme-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          />
          <button
            onClick={handleRename}
            disabled={busy || !name.trim()}
            className="min-h-[44px] py-2.5 px-5 rounded-lg font-bold text-sm theme-accent-bg theme-text-inverse transition-all disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
        {message && <p className="mt-3 text-sm theme-accent font-semibold">{message}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ganadores, todos */}
        <section className="theme-card theme-border-primary border rounded-lg p-6">
          <h3 className="text-sm font-bold theme-text-secondary uppercase mb-4">{t('winners')}</h3>
          {winners.length === 0 ? (
            <p className="theme-text-secondary text-sm">{t('noWinnersYet')}</p>
          ) : (
            <ul className="space-y-2">
              {winners.map((cat) => (
                <li key={cat.id} className="flex justify-between gap-3 text-sm">
                  <span className="theme-text-tertiary truncate">{getCategoryTitle(cat, language)}</span>
                  <span className="theme-text-primary font-semibold text-right">
                    {getOptionLabel(cat, cat.winner, language)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Clasificación completa, no solo el top */}
        <section className="theme-card theme-border-primary border rounded-lg p-6">
          <h3 className="text-sm font-bold theme-text-secondary uppercase mb-4">{t('ranking')}</h3>
          {leaderboard.length === 0 ? (
            <p className="theme-text-secondary text-sm">{t('noRankingYet')}</p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((entry) => (
                // Los archivos nuevos no guardan el UID, solo su huella.
                <li
                  key={entry.uidHash || entry.userId || entry.rank}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="theme-text-tertiary flex items-center gap-2 min-w-0">
                    <span className="w-5 shrink-0 flex items-center justify-center">
                      {/* El puesto, en texto, aunque se vea como medalla. */}
                      <span className="sr-only">
                        {t('position')} {entry.rank}
                      </span>
                      {entry.rank <= 3 ? (
                        <MedalIcon rank={entry.rank} className="w-5 h-5" />
                      ) : (
                        <span aria-hidden="true" className="tabular-nums">{entry.rank}</span>
                      )}
                    </span>
                    <span className="truncate">{entry.nickname}</span>
                  </span>
                  <span className="theme-accent font-bold">
                    {entry.points} {t('pts')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Borrar: al final y con su propio marco de aviso, lejos del resto. No es
          una acción más del archivo, es deshacerlo. */}
      <section className="bg-status-error-light border border-status-error rounded-lg p-6">
        <h3 className="text-lg font-bold text-status-error mb-1">{t('deleteEdition')}</h3>
        <p className="theme-text-secondary text-sm mb-4">{t('deleteEditionHelp')}</p>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="min-h-[44px] py-2.5 px-5 rounded-lg font-bold text-sm btn-danger border theme-border-control transition-all disabled:opacity-50"
        >
          {t('deleteEdition')}
        </button>
      </section>
    </div>
  );
}
