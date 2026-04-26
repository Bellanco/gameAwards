import React from 'react';
import { useTranslation } from '../data/literals';
import { LanguageIcon } from './Icons';

/**
 * LoginScreen v2 - Con selector de idioma y diseño profesional
 */
export default function LoginScreen({
  onLogin,
  isLoading,
  errorMessage,
  daysRemaining,
  language,
  onToggleLanguage
}) {
  const t = useTranslation(language);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 flex flex-col">
      {/* Selector de idioma - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold transition-all"
          title="Toggle Language / Cambiar idioma"
        >
          <LanguageIcon className="w-4 h-4" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-4 leading-tight">
              THE GAME
              <span className="block text-yellow-500">AWARDS</span>
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full mx-auto mb-6"></div>
            <p className="text-lg md:text-2xl text-slate-300 font-light">
              {t('votingOpen')}
            </p>
          </div>

          {/* Card de Login */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl mb-8">
            {/* Descripción */}
            <div className="mb-8 text-center">
              <p className="text-slate-300 text-lg leading-relaxed mb-4">
                {t('loginSubtitle')}
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-slate-400 flex-wrap">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  {t('oneVote')}
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  {t('secureVoting')}
                </span>
              </div>
            </div>

            {/* Días restantes */}
            {daysRemaining !== null && (
              <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                <p className="text-yellow-400 font-bold text-lg">
                  {daysRemaining > 0 
                    ? `${daysRemaining} ${t('daysRemaining')}`
                    : t('votingNowOpen')}
                </p>
              </div>
            )}

            {/* Mensajes de Error */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                <p className="font-semibold">Unable to sign in</p>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Botón de Login */}
            <button
              onClick={onLogin}
              disabled={isLoading}
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 mb-6 ${
                isLoading
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-slate-900 hover:from-yellow-400 hover:to-yellow-300 hover:shadow-lg hover:shadow-yellow-500/30 transform hover:scale-105'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">●</span>
                  Connecting...
                </>
              ) : (
                <>
                  {t('loginBtn')}
                </>
              )}
            </button>

            {/* Términos */}
            <p className="text-xs text-slate-500 text-center">
              By signing in, you agree to our terms. Your vote will be securely recorded.
            </p>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-2xl mb-2">1</p>
              <p className="text-sm text-slate-300">Sign in with your Google account</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-2xl mb-2">2</p>
              <p className="text-sm text-slate-300">Vote across all categories</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-2xl mb-2">3</p>
              <p className="text-sm text-slate-300">Review and submit your ballot</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-xs text-slate-500 border-t border-slate-800 pt-6">
            <p>The official voting platform for The Game Awards</p>
          </div>
        </div>
      </div>
    </div>
  );
}
