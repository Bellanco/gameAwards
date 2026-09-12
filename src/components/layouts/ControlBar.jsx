import React from 'react';
import ThemeLanguageControls from '../ui/ThemeLanguageControls';

/**
 * ControlBar - Barra de controles flotante en la esquina superior derecha.
 * El par de botones vive en ThemeLanguageControls, compartido con Header.
 *
 * @component
 * @param {string} language - Idioma actual ('es' | 'en')
 * @param {Function} onToggleLanguage - Callback para cambiar idioma
 * @param {string} theme - Tema actual ('light' | 'dark')
 * @param {Function} onToggleTheme - Callback para cambiar tema
 * @returns {React.ReactElement}
 */
export default function ControlBar({
  language,
  onToggleLanguage,
  theme,
  onToggleTheme
}) {
  return (
    <ThemeLanguageControls
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
      className="absolute top-4 right-4 z-50 flex gap-2"
    />
  );
}
