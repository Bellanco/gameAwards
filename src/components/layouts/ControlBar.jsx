import React from 'react';
import { LanguageIcon, ThemeIcon } from '../Icons';

/**
 * ControlBar - Componente reutilizable para barra de controles
 * Muestra selector de idioma y tema en la esquina superior derecha
 * 
 * @component
 * @param {string} language - Idioma actual ('es' | 'en')
 * @param {Function} onToggleLanguage - Callback para cambiar idioma
 * @param {string} theme - Tema actual ('light' | 'dark')
 * @param {Function} onToggleTheme - Callback para cambiar tema
 * @param {Object} customClass - Clases CSS personalizadas
 * @returns {React.ReactElement}
 */
export default function ControlBar({ 
  language, 
  onToggleLanguage, 
  theme, 
  onToggleTheme,
  customClass = {}
}) {
  const {
    container = 'absolute top-4 right-4 z-50 flex gap-2',
    buttonBase = 'flex items-center gap-2 px-3 py-2 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all hover:border-yellow-500 hover:scale-105'
  } = customClass;

  return (
    <div className={container}>
      {/* Botón de Tema */}
      <button
        onClick={onToggleTheme}
        className={buttonBase}
        title={theme === 'light' ? 'Tema Oscuro' : 'Tema Claro'}
        aria-label="Toggle theme"
      >
        <ThemeIcon className="w-4 h-4" isDark={theme === 'dark'} />
      </button>

      {/* Botón de Idioma */}
      <button
        onClick={onToggleLanguage}
        className={buttonBase}
        title="Toggle Language"
        aria-label="Toggle language"
      >
        <LanguageIcon className="w-4 h-4" />
        <span>{language.toUpperCase()}</span>
      </button>
    </div>
  );
}
