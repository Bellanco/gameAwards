import React from 'react';
import { useTranslation } from '../data/literals';
import { ScreenLayout } from './layouts';

/**
 * LoginScreen v2 - Refactorizado con ScreenLayout y ControlBar reutilizables
 * Muestra pantalla de login con hero section y cards informativas
 */
export default function LoginScreen({
  onLogin,
  isLoading,
  errorMessage,
  daysRemaining,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme
}) {
  const t = useTranslation(language);

  return (
    <ScreenLayout
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-status-warning/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-status-info/10 rounded-full blur-3xl"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter theme-text-primary mb-4 leading-tight">
              THE GAME
              <span className="block text-status-warning">AWARDS</span>
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-status-warning to-orange-600 rounded-full mx-auto mb-6"></div>
            <p className="text-lg md:text-2xl theme-text-secondary font-light">
              {t('votingOpen')}
            </p>
          </div>

          {/* Card de Login */}
          <div className="theme-card backdrop-blur-xl border rounded-2xl p-8 md:p-12 shadow-2xl mb-8">
            {/* Descripción */}
            <div className="mb-8 text-center">
              <p className="theme-text-primary text-lg leading-relaxed mb-4">
                {t('loginSubtitle')}
              </p>
              <div className="flex items-center justify-center gap-4 text-sm theme-text-primary flex-wrap">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-status-warning rounded-full"></span>
                  {t('oneVote')}
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-status-warning rounded-full"></span>
                  {t('secureVoting')}
                </span>
              </div>
            </div>

            {/* Días restantes */}
            {daysRemaining !== null && (
              <div className="mb-8 p-4 bg-status-warning-light border border-status-warning rounded-lg text-center">
                <p className="text-status-warning font-bold text-lg">
                  {daysRemaining > 0 
                    ? `${daysRemaining} ${t('daysRemaining')}`
                    : t('votingNowOpen')}
                </p>
              </div>
            )}

            {/* Mensajes de Error */}
            {errorMessage && (
              <div className="mb-6 p-4 status-error rounded-lg text-sm">
                <p className="font-semibold">{t('unableToSignIn')}</p>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Botón de Login */}
            <button
              onClick={onLogin}
              disabled={isLoading}
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 mb-6 ${
                isLoading
                  ? 'theme-container-secondary theme-text-tertiary cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 hover:shadow-lg hover:shadow-amber-600/30 transform hover:scale-105'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">●</span>
                  {t('connecting')}
                </>
              ) : (
                <>
                  {t('loginBtn')}
                </>
              )}
            </button>

            {/* Términos */}
            <p className="text-xs theme-text-tertiary text-center">
              {t('loginTerms')}
            </p>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="theme-card border rounded-lg p-4">
              <p className="text-2xl mb-2 text-status-warning">1</p>
              <p className="text-sm theme-text-secondary">{t('step1Title')}</p>
            </div>
            <div className="theme-card border rounded-lg p-4">
              <p className="text-2xl mb-2 text-status-warning">2</p>
              <p className="text-sm theme-text-secondary">{t('step2Title')}</p>
            </div>
            <div className="theme-card border rounded-lg p-4">
              <p className="text-2xl mb-2 text-status-warning">3</p>
              <p className="text-sm theme-text-secondary">{t('step3Title')}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-xs theme-text-tertiary theme-border-primary border-t pt-6">
            <p>{t('officialsVotingPlatform')}</p>
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
}
