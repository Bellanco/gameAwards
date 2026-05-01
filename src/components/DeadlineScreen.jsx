import React from 'react';
import { useTranslation } from '../data/literals';
import { CloseIcon } from './Icons';
import { ScreenLayout } from './layouts';
import { Header } from './ui';

/**
 * DeadlineScreen v4 - Refactorizado con Header reutilizable
 * Muestra que la votación ha finalizado
 */
export default function DeadlineScreen({ language, onToggleLanguage, theme, onToggleTheme }) {
  const t = useTranslation(language);

  // Header con controles
  const headerContent = (
    <Header
      title={t('votingClosed')}
      subtitle={t('votingDeadlineMessage')}
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
    />
  );

  return (
    <ScreenLayout
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
      header={headerContent}
      showControlBar={false}
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 theme-bg-overlay-light rounded-full blur-3xl"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Icono de reloj */}
          <div className="mb-8">
            <CloseIcon className="w-24 h-24 mx-auto text-red-500 animate-pulse" />
          </div>

          {/* Título */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight theme-text-primary mb-4">
            {t('votingClosed')}
          </h1>

          {/* Subtítulo */}
          <p className="text-xl theme-text-secondary mb-8">
            {t('votingDeadlineMessage')}
          </p>

          {/* Información principal */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 mb-8">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-red-400 uppercase font-semibold mb-2">{t('status')}</p>
                <p className="text-2xl font-bold text-red-400">{t('closed')}</p>
              </div>
              <div className="border-t border-red-500/20 pt-4">
                <p className="text-sm theme-text-secondary leading-relaxed">
                  {t('noNewVotesAccepted')}
                </p>
              </div>
            </div>
          </div>

          {/* Próximas acciones */}
          <div className="space-y-3 mb-10">
            <div className="flex items-center gap-4 p-4 theme-card theme-border-primary border rounded-lg">
              <span className="text-2xl font-bold">■</span>
              <div className="text-left">
                <p className="text-xs theme-text-tertiary uppercase">{t('results')}</p>
                <p className="theme-text-primary font-semibold">{t('resultsWillBeShown')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 theme-card theme-border-primary border rounded-lg">
              <span className="text-2xl font-bold">▲</span>
              <div className="text-left">
                <p className="text-xs theme-text-tertiary uppercase">{t('nextEdition')}</p>
                <p className="theme-text-primary font-semibold">{t('decemberNextYear')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 theme-card theme-border-primary border rounded-lg">
              <span className="text-2xl font-bold">▶</span>
              <div className="text-left">
                <p className="text-xs theme-text-tertiary uppercase">{t('stayTuned')}</p>
                <p className="theme-text-primary font-semibold">{t('weWillNotifyYou')}</p>
              </div>
            </div>
          </div>

          {/* Mensaje motivacional */}
          <div className="theme-card theme-border-primary border rounded-xl p-6 mb-8">
            <p className="theme-text-secondary leading-relaxed">
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
          <p className="mt-6 text-xs theme-text-tertiary">
            © The Game Awards {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </ScreenLayout>
  );
}