import React from 'react';
import { useTranslation } from '../data/literals';
import { StarIcon } from './Icons';
import { ScreenLayout } from './layouts';
import { Header } from './ui';

/**
 * SuccessScreen v4 - Refactorizado con Header reutilizable
 * Muestra confirmación de voto exitoso con animaciones
 */
export default function SuccessScreen({ 
  userNickname, 
  onLogout, 
  onReturnHome, 
  language, 
  onToggleLanguage, 
  theme, 
  onToggleTheme 
}) {
  const t = useTranslation(language);

  // Header con controles
  const headerContent = (
    <Header
      title={t('ballotSubmitted')}
      subtitle={`${t('thankYou')}, ${userNickname}`}
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
      {/* Confeti animado de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          {/* Animación de celebración */}
          <div className="mb-8 flex justify-center items-center gap-2">
            <div className="animate-bounce" style={{ animationDelay: '0s' }}>
              <StarIcon className="w-16 h-16 md:w-20 md:h-20 text-amber-600" />
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
              <StarIcon className="w-16 h-16 md:w-20 md:h-20 text-amber-600" />
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.4s' }}>
              <StarIcon className="w-16 h-16 md:w-20 md:h-20 text-amber-600" />
            </div>
          </div>

          {/* Título principal */}
          <h1 className="text-4xl md:text-6xl font-black theme-text-primary mb-4 tracking-tight">
            {t('ballotSubmitted')}
          </h1>

          {/* Subtítulo */}
          <p className="text-xl md:text-2xl text-amber-700 font-bold mb-2">
            {t('thankYou')}, {userNickname}
          </p>
          <p className="theme-text-secondary mb-8">
            {t('voteSecurelyRecorded')}
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div className="theme-card theme-border-primary border rounded-lg p-6">
              <div className="text-2xl mb-2 flex justify-center">
                <StarIcon className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm theme-text-secondary">{t('yourVoteSecure')}</p>
            </div>
            <div className="theme-card theme-border-primary border rounded-lg p-6">
              <div className="text-2xl mb-2 flex justify-center">
                <StarIcon className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm theme-text-secondary">{t('oneVotePerPerson')}</p>
            </div>
            <div className="theme-card theme-border-primary border rounded-lg p-6">
              <div className="text-2xl mb-2 flex justify-center">
                <StarIcon className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm theme-text-secondary">{t('resultsComingSoon')}</p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-12 text-left">
            <p className="text-xs text-green-400 uppercase font-semibold mb-4">{t('confirmation')}</p>
            <p className="text-sm theme-text-secondary mb-3">
              <span className="font-semibold">{t('yourVoteConfirmed')}</span> {t('willNotBeAbleToChange')}
            </p>
            <p className="text-xs theme-text-tertiary">
              {t('checkBackDecember')}
            </p>
          </div>


          {/* Footer message */}
          <p className="mt-8 text-xs theme-text-tertiary text-center">
            {t('thankYouForVoting')}
          </p>
        </div>
      </div>
    </ScreenLayout>
  );
}
