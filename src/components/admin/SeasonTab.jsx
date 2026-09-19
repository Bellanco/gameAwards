import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { SEASON_STAGE } from '../../utils/votingSchedule';
import { getSeasonLabel } from '../../utils/seasonId';
import { useSeasonPreview } from '../../hooks';

/** Formato legible de una fecha ISO en el idioma activo. */
const formatDate = (iso, language) =>
  iso ? new Date(iso).toLocaleDateString(language === 'en' ? 'en-GB' : 'es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '';

/** Tarjeta con título y, opcionalmente, una frase de ayuda. */
function Panel({ title, help, tone = 'normal', children }) {
  const border =
    tone === 'danger'
      ? 'bg-status-error-light border-status-error'
      : 'theme-card theme-border-primary';
  const titleColor = tone === 'danger' ? 'text-status-error' : 'theme-text-primary';

  return (
    <section className={`${border} border rounded-lg p-6`}>
      <h3 className={`text-lg font-bold ${titleColor} mb-1`}>{title}</h3>
      {help && <p className="theme-text-secondary text-sm mb-4">{help}</p>}
      {children}
    </section>
  );
}

/** Botón principal de cada paso. */
function ActionButton({ onClick, disabled, tone = 'accent', children }) {
  const style =
    tone === 'danger'
      ? 'btn-danger border theme-border-primary'
      : 'theme-accent-bg theme-text-inverse';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] py-3 px-6 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${style}`}
    >
      {children}
    </button>
  );
}

/**
 * Pestaña Temporada: el ciclo de vida de una edición, y nada más.
 *
 * Enseña UN paso cada vez, el que toca (ver `SEASON_STAGE`):
 *
 *   sin edición          -> formulario de apertura (nombre + fecha de cierre)
 *   votación abierta     -> estado y botón para cerrar antes de tiempo
 *   cerrada sin publicar -> resumen y salida hacia Ganadores
 *
 * PUBLICAR NO ESTÁ AQUÍ. Es el final del trabajo con los ganadores, así que vive
 * donde ese trabajo termina: al guardar el último, la pestaña Ganadores ofrece
 * publicar (ver WinnersPanel y admin/PublishDialog). Tenerlo en esta pestaña
 * obligaba a marcar los ganadores en una pantalla y volver a otra a pulsar un
 * botón, con la clasificación de una edición ya decidida en medio.
 *
 * Antes eran cinco bloques simultáneos (identidad, tres fechas, cierre forzado,
 * publicación y reinicio) y había que saber en qué orden usarlos. Los ganadores
 * de las ediciones pasadas se consultan en la pestaña Histórico.
 */
export default function SeasonTab({ config, controls, onGoToWinners }) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  const { stage, draft, setDraftField, busy, message, error, openSeason, closeNow } = controls;

  // Los datos de la edición se leen aquí, frescos de Firestore, y no llegan del
  // AdminPanel: publicar archiva lo que hay en la base de datos, así que esta
  // pantalla —que es donde se decide publicar— tiene que enseñar eso mismo.
  const preview = useSeasonPreview({ stage });

  const label = getSeasonLabel(config);
  const ballotCount = preview.ballots.length;
  const votableCategories = preview.categories.length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-black theme-text-primary">{t('season')}</h2>
        <p className="theme-text-secondary text-sm">{t('seasonDescription')}</p>
      </div>

      {message && (
        <p
          role="status"
          className="p-3 rounded-lg theme-card border border-status-success text-sm theme-text-primary"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="p-3 rounded-lg bg-status-error-light border border-status-error text-sm theme-text-primary"
        >
          {error}
        </p>
      )}

      {/* ── 1. No hay edición: abrir una ────────────────────────────────── */}
      {stage === SEASON_STAGE.NONE && (
        <Panel title={t('newSeason')} help={t('newSeasonHelp')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold theme-text-secondary">
              {t('seasonNameLabel')}
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraftField('name', e.target.value)}
                placeholder={t('seasonNamePlaceholder')}
                disabled={busy}
                maxLength={60}
                className="mt-1 block w-full min-h-[44px] px-4 py-2.5 theme-container-secondary theme-border-control border rounded theme-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              />
            </label>
            <div>
              <label
                htmlFor="closesDay"
                className="block text-sm font-semibold theme-text-secondary"
              >
                {t('closesOnLabel')}
              </label>
              <input
                id="closesDay"
                type="date"
                value={draft.closesDay}
                onChange={(e) => setDraftField('closesDay', e.target.value)}
                disabled={busy}
                aria-describedby="closesDayHint"
                className="mt-1 block w-full min-h-[44px] px-4 py-2.5 theme-container-secondary theme-border-control border rounded theme-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              />
              {/* La hora no se elige, se da: el día elegido se vive entero y el
                  cierre cae a las 23:59:59.999 de Europe/Madrid (ver
                  utils/closingDate.js). Decirlo aquí evita la duda de si el día
                  señalado cuenta o no. */}
              <p id="closesDayHint" className="mt-1 text-xs theme-text-tertiary">
                {t('closesAtEndOfDay')}
              </p>
            </div>
          </div>

          {votableCategories === 0 && (
            <p className="mt-4 text-sm text-status-error font-semibold">{t('noCategoriesWarning')}</p>
          )}

          <div className="mt-5">
            <ActionButton onClick={openSeason} disabled={busy}>
              {t('openSeason')}
            </ActionButton>
          </div>
        </Panel>
      )}

      {/* ── 2. Votación abierta ─────────────────────────────────────────── */}
      {stage === SEASON_STAGE.OPEN && (
        <Panel title={label} help={t('seasonOpenHelp')}>
          <dl className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <dt className="text-xs uppercase theme-text-tertiary">{t('votingOpen')}</dt>
              <dd className="text-sm font-semibold text-status-success">
                {t('closesOn')} {formatDate(config.closesAt, language)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase theme-text-tertiary">{t('votes')}</dt>
              <dd className="text-2xl font-black theme-accent">{ballotCount}</dd>
            </div>
          </dl>
          <ActionButton onClick={closeNow} disabled={busy} tone="danger">
            {t('closeNow')}
          </ActionButton>
          <p className="text-xs theme-text-tertiary mt-3">{t('closeNowHelp')}</p>
        </Panel>
      )}

      {/* ── 3. Cerrada: el trabajo que queda está en Ganadores ──────────── */}
      {stage === SEASON_STAGE.PENDING && (
        <Panel title={label} help={t('seasonPendingHelp')}>
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs uppercase theme-text-tertiary">{t('votes')}</dt>
              <dd className="text-2xl font-black theme-accent">{ballotCount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase theme-text-tertiary">{t('winners')}</dt>
              <dd className="text-2xl font-black theme-accent">
                {preview.winnersCount}
                <span className="text-sm theme-text-tertiary">/{votableCategories}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase theme-text-tertiary">{t('closesOn')}</dt>
              <dd className="text-sm font-semibold theme-text-secondary">
                {formatDate(config.closesAt, language)}
              </dd>
            </div>
          </dl>

          {/* Faltan ganadores: avisar ANTES, porque publicar es irreversible. */}
          {!preview.isLoading && preview.winnersCount < votableCategories && (
            <p className="mt-4 text-sm text-status-error font-semibold">
              {t('missingWinnersWarning')}
            </p>
          )}

          {/* Publicar ya NO vive aquí: la edición se cierra donde se termina de
              trabajar en ella, al guardar el último ganador (ver WinnersPanel).
              Esta pestaña solo abre y cierra, y de aquí se sale hacia allí. */}
          <div className="mt-5">
            <ActionButton onClick={onGoToWinners} disabled={busy}>
              {t('goToWinners')}
            </ActionButton>
          </div>
        </Panel>
      )}
    </div>
  );
}
