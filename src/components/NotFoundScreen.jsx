import React from 'react';
import { LanguageIcon, ThemeIcon } from './Icons';
import { useTranslation } from '../data/literals';

/**
 * NotFoundScreen - Pantalla 404 minimalista
 * Muestra un error genérico sin revelar información sobre permisos
 * Evita ataques de enumeración de rutas
 */
export default function NotFoundScreen({ language = 'es', onToggleLanguage, theme = 'dark', onToggleTheme, onGoHome }) {
  const t = useTranslation(language);

  return (
    <div className="min-h-screen theme-gradient-primary flex items-center justify-center p-4 relative">
      {/* Controls - Top right */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-3 py-2 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all hover:shadow-md"
          title={theme === 'light' ? t('darkTheme') : t('lightTheme')}
        >
          <ThemeIcon className="w-4 h-4" isDark={theme === 'dark'} />
        </button>
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-2 px-3 py-2 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all hover:shadow-md"
          title={t('changeLanguage')}
        >
          <LanguageIcon className="w-4 h-4" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      {/* 404 Content */}
      <div className="text-center max-w-md">
        {/* Large 404 */}
        <div className="mb-8">
          <h1 className="text-9xl md:text-[150px] font-black theme-accent opacity-20 leading-none">
            404
          </h1>
        </div>

        {/* Message */}
        <div className="space-y-4 mb-8">
          <h2 className="text-3xl md:text-4xl font-black theme-text-primary">
            {t('pageNotFound')}
          </h2>
          <p className="text-lg theme-text-secondary">
            {t('pageNotExist')}
          </p>
          <p className="text-sm theme-text-tertiary">
            {t('pageNotFoundDescription')}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {t('goHome')}
        </button>

        {/* Decorative element */}
        <div className="mt-16 pt-8 border-t theme-border-primary">
          <p className="text-xs theme-text-tertiary">THE GAME AWARDS</p>
        </div>
      </div>
    </div>
  );
}
