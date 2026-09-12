import React from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { ScreenLayout } from './layouts';

/**
 * LoginScreen v2 - Refactorizado con ScreenLayout y ControlBar reutilizables
 * Muestra pantalla de login con hero section y cards informativas
 *
 * @param {Object} props
 * @param {'vote'|'results'} [props.purpose='vote'] - a qué se entra. Es el mismo
 *   login en los dos casos, pero el texto no puede serlo: quien llega cuando la
 *   edición ya terminó no viene a votar, viene a ver quién ganó, y ofrecerle
 *   «vota una sola vez» y los tres pasos de la votación desorienta.
 */
export default function LoginScreen({
  onLogin,
  isLoading,
  errorMessage,
  daysRemaining,
  purpose = 'vote',
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const forResults = purpose === 'results';

  return (
    <ScreenLayout
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-status-warning-light rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-status-info-light rounded-full blur-3xl"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 pt-20 sm:pt-8 md:pt-4">
        <div className="w-full max-w-2xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-black tracking-wide theme-display uppercase theme-text-primary mb-4 leading-tight">
              THE GAME
              <span className="block theme-accent">AWARDS</span>
            </h1>
            <div
              className="h-1.5 w-36 rounded-full mx-auto mb-6 theme-shine"
              style={{
                backgroundImage: 'linear-gradient(90deg, color-mix(in srgb, var(--color-secondary) 72%, #000000 28%), color-mix(in srgb, var(--color-accent) 88%, #f4d08b 12%), color-mix(in srgb, var(--color-secondary) 72%, #000000 28%))'
              }}
            />
            <p className="text-lg md:text-2xl theme-text-secondary font-light">
              {forResults ? t('resultsAvailable') : t('votingOpen')}
            </p>
          </div>

          {/* Card de Login */}
          <div className="theme-card theme-card-strong theme-border-primary backdrop-blur-xl border rounded-2xl p-8 md:p-12 theme-shadow-lg theme-entrance mb-8">
            {/* Descripción */}
            <div className="mb-8 text-center">
              <p className="theme-text-primary text-lg leading-relaxed mb-4">
                {forResults ? t('loginForResultsSubtitle') : t('loginSubtitle')}
              </p>
              {!forResults && (
                <div className="flex items-center justify-center gap-4 text-base theme-text-primary font-semibold flex-wrap">
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
              )}
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
                  ? 'theme-container-secondary theme-text-primary cursor-not-allowed'
                  : 'theme-btn-primary'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-transparent border-t-(--color-accent) border-r-(--color-secondary) animate-spin" />
                  {t('connecting')}
                </>
              ) : (
                <>
                  {t('loginBtn')}
                </>
              )}
            </button>

            {/* Términos */}
            <p className="text-base theme-text-primary text-center">
              {t('loginTerms')}
            </p>
          </div>

          {/* Los tres pasos de la votación solo tienen sentido si se viene a votar. */}
          {!forResults && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="theme-card theme-border-primary border rounded-lg p-4 theme-card-hover">
                <p className="text-2xl mb-2 theme-accent theme-display">1</p>
                <p className="text-sm theme-text-secondary">{t('step1Title')}</p>
              </div>
              <div className="theme-card theme-border-primary border rounded-lg p-4 theme-card-hover">
                <p className="text-2xl mb-2 theme-accent theme-display">2</p>
                <p className="text-sm theme-text-secondary">{t('step2Title')}</p>
              </div>
              <div className="theme-card theme-border-primary border rounded-lg p-4 theme-card-hover">
                <p className="text-2xl mb-2 theme-accent theme-display">3</p>
                <p className="text-sm theme-text-secondary">{t('step3Title')}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-sm theme-text-secondary theme-border-primary border-t pt-6">
            <p>{t('officialsVotingPlatform')}</p>
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
}
