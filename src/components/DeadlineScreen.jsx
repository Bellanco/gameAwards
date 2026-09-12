import React from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { CloseIcon } from './Icons';
import { ScreenLayout } from './layouts';
import { Header } from './ui';

/**
 * DeadlineScreen - Pantalla de "no se puede votar ahora".
 *
 * Cubre los dos extremos del calendario que fija el admin:
 *  - `isScheduled`: la edición aún no ha abierto (hay `opensAt` en el futuro).
 *  - por defecto: la votación ya cerró.
 *
 * Cuando hay fecha de publicación de resultados se anuncia aquí, para que quien
 * llega tarde sepa cuándo volver (`resultsAt`).
 *
 * @param {Object} props
 * @param {boolean} [props.isScheduled] - la votación todavía no ha abierto
 * @param {string|null} [props.opensAt] - instante de apertura (ISO)
 * @param {string|null} [props.resultsAt] - publicación de resultados (ISO)
 */
export default function DeadlineScreen({ isScheduled = false, opensAt = null, resultsAt = null }) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  const locale = language === 'en' ? 'en-GB' : 'es-ES';
  const formatDate = (iso) => new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const title = isScheduled ? t('votingNotOpenYet') : t('votingClosed');
  const subtitle = isScheduled ? t('votingOpensSoonMessage') : t('votingDeadlineMessage');
  const statusText = isScheduled ? t('votingScheduled') : t('closed');
  const explanation = isScheduled
    ? opensAt
      ? t('votingOpensOn').replace('{date}', formatDate(opensAt))
      : t('votesNotAcceptedYet')
    : t('noNewVotesAccepted');
  const resultsText = resultsAt
    ? t('resultsAvailableOn').replace('{date}', formatDate(resultsAt))
    : t('resultsWillBeShown');

  // Header con controles
  const headerContent = (
    <Header />
  );

  return (
    <ScreenLayout
      header={headerContent}
      showControlBar={false}
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-status-error-light rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 theme-bg-overlay-light rounded-full blur-3xl"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Icono de reloj */}
          <div className="mb-8">
            <CloseIcon className="w-24 h-24 mx-auto text-status-error theme-flicker" />
          </div>

          {/* Título */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight theme-display uppercase theme-text-primary mb-4">
            {title}
          </h1>

          {/* Subtítulo */}
          <p className="text-xl theme-text-secondary mb-8">
            {subtitle}
          </p>

          {/* Información principal */}
          <div className="bg-status-error-light border border-status-error rounded-2xl p-8 mb-8">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-status-error uppercase font-semibold mb-2">{t('status')}</p>
                <p className="text-2xl font-bold text-status-error">{statusText}</p>
              </div>
              <div className="border-t border-status-error/30 pt-4">
                <p className="text-sm theme-text-primary leading-relaxed">
                  {explanation}
                </p>
              </div>
            </div>
          </div>

          {/* Próximas acciones */}
          <div className="space-y-3 mb-10">
            <div className="flex items-center gap-4 p-4 theme-card theme-border-primary border rounded-lg">
              <span className="text-2xl font-bold theme-accent">■</span>
              <div className="text-left">
                <p className="text-sm theme-text-secondary uppercase">{t('results')}</p>
                <p className="theme-text-primary font-semibold">{resultsText}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 theme-card theme-border-primary border rounded-lg">
              <span className="text-2xl font-bold theme-accent">▲</span>
              <div className="text-left">
                <p className="text-sm theme-text-secondary uppercase">{t('nextEdition')}</p>
                <p className="theme-text-primary font-semibold">{t('decemberNextYear')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 theme-card theme-border-primary border rounded-lg">
              <span className="text-2xl font-bold theme-accent">▶</span>
              <div className="text-left">
                <p className="text-sm theme-text-secondary uppercase">{t('stayTuned')}</p>
                <p className="theme-text-primary font-semibold">{t('weWillNotifyYou')}</p>
              </div>
            </div>
          </div>

          {/* Mensaje motivacional */}
          <div className="theme-card theme-border-primary border rounded-xl p-6 mb-8">
            <p className="theme-text-primary leading-relaxed">
              {t('thankYouForInterest')}
            </p>
          </div>

          {/* Botón de regreso */}
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg theme-btn-secondary hover:shadow-lg transition-all transform hover:scale-105"
          >
            {t('backToStart')}
          </button>

          {/* Footer */}
          <p className="mt-6 text-sm theme-text-secondary">
            © The Game Awards {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </ScreenLayout>
  );
}