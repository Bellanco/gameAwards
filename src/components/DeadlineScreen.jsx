import React from 'react';
import { useTranslation } from '../data/literals';
import { CloseIcon, LanguageIcon } from './Icons';

/**
 * DeadlineScreen v2 - Con idioma e icons profesionales
 */
export default function DeadlineScreen({ language, onToggleLanguage }) {
  const t = useTranslation(language);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 flex flex-col items-center justify-center relative overflow-hidden">
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

      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-slate-700/5 rounded-full blur-3xl"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 text-center max-w-md">
        {/* Icono de reloj */}
        <div className="mb-8">
          <CloseIcon className="w-24 h-24 mx-auto text-red-500 animate-pulse" />
        </div>

        {/* Título */}
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
          {t('votingClosed')}
        </h1>

        {/* Subtítulo */}
        <p className="text-xl text-slate-400 mb-8">
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
              <p className="text-sm text-slate-300 leading-relaxed">
                {t('noNewVotesAccepted')}
              </p>
            </div>
          </div>
        </div>

        {/* Próximas acciones */}
        <div className="space-y-3 mb-10">
          <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <span className="text-2xl font-bold">■</span>
            <div className="text-left">
              <p className="text-xs text-slate-500 uppercase">{t('results')}</p>
              <p className="text-white font-semibold">{t('resultsWillBeShown')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <span className="text-2xl font-bold">▲</span>
            <div className="text-left">
              <p className="text-xs text-slate-500 uppercase">{t('nextEdition')}</p>
              <p className="text-white font-semibold">{t('decemberNextYear')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <span className="text-2xl font-bold">▶</span>
            <div className="text-left">
              <p className="text-xs text-slate-500 uppercase">{t('stayTuned')}</p>
              <p className="text-white font-semibold">{t('weWillNotifyYou')}</p>
            </div>
          </div>
        </div>

        {/* Mensaje motivacional */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 mb-8">
          <p className="text-slate-300 leading-relaxed">
            {t('thankYouForInterest')}
          </p>
        </div>

        {/* Botón de regreso */}
        <button
          onClick={() => window.location.reload()}
          className="w-full py-4 px-6 rounded-xl font-bold text-lg bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-600 hover:to-slate-700 hover:shadow-lg transition-all transform hover:scale-105 border border-slate-600"
        >
          {t('backToStart')}
        </button>

        {/* Footer */}
        <p className="mt-6 text-xs text-slate-500">
          © The Game Awards {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
