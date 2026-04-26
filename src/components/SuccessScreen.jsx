import React from 'react';
import { useTranslation } from '../data/literals';
import { StarIcon, LanguageIcon } from './Icons';

/**
 * SuccessScreen v2 - Con idioma e icons profesionales
 */
export default function SuccessScreen({ userNickname, onLogout, language, onToggleLanguage }) {
  const t = useTranslation(language);
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 flex items-center justify-center p-4">
      {/* Selector de idioma */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold transition-all"
        >
          <LanguageIcon className="w-4 h-4" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Confeti animado de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 text-center max-w-2xl">
        {/* Animación de celebración */}
        <div className="mb-8 flex justify-center items-center gap-2">
          <div className="animate-bounce" style={{animationDelay: '0s'}}>
            <StarIcon className="w-16 h-16 md:w-20 md:h-20 text-yellow-500" />
          </div>
          <div className="animate-bounce" style={{animationDelay: '0.2s'}}>
            <StarIcon className="w-16 h-16 md:w-20 md:h-20 text-yellow-500" />
          </div>
          <div className="animate-bounce" style={{animationDelay: '0.4s'}}>
            <StarIcon className="w-16 h-16 md:w-20 md:h-20 text-yellow-500" />
          </div>
        </div>

        {/* Título principal */}
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
          {t('ballotSubmitted')}
        </h1>

        {/* Subtítulo */}
        <p className="text-xl md:text-2xl text-yellow-400 font-bold mb-2">
          {t('thankYou')}, {userNickname}
        </p>
        <p className="text-slate-300 mb-8">
          {t('voteSecurelyRecorded')}
        </p>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="text-2xl mb-2 flex justify-center">
              <StarIcon className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-sm text-slate-300">{t('yourVoteSecure')}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="text-2xl mb-2 flex justify-center">
              <StarIcon className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-sm text-slate-300">{t('oneVotePerPerson')}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="text-2xl mb-2 flex justify-center">
              <StarIcon className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-sm text-slate-300">{t('resultsComingSoon')}</p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-12 text-left">
          <p className="text-xs text-green-400 uppercase font-semibold mb-4">{t('confirmation')}</p>
          <p className="text-sm text-slate-300 mb-3">
            <span className="font-semibold">{t('yourVoteConfirmed')}</span> {t('willNotBeAbleToChange')}
          </p>
          <p className="text-xs text-slate-400">
            {t('checkBackDecember')}
          </p>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full py-4 px-6 rounded-lg font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 text-slate-900 hover:from-yellow-400 hover:to-yellow-300 hover:shadow-lg hover:shadow-yellow-500/30 transform hover:scale-105 transition-all"
        >
          {t('signOut')}
        </button>

        {/* Footer message */}
        <p className="mt-8 text-xs text-slate-500 text-center">
          {t('thankYouForVoting')}
        </p>
      </div>
    </div>
  );
}
