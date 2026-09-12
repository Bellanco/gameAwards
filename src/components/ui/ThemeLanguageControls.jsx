import React from 'react';
import { LanguageIcon, ThemeIcon } from '../Icons';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';

/**
 * ThemeLanguageControls - El par de botones de tema e idioma.
 *
 * Existía copiado a mano en cuatro sitios (ControlBar, Header, AdminPanel y la
 * antigua NotFoundScreen) con las mismas clases repetidas y diferencias entre
 * ellos: a dos les faltaba el `aria-label`. Aquí viven una sola vez.
 *
 * Los botones miden 44x44 px como mínimo: es el objetivo táctil recomendado por
 * WCAG 2.5.5 y las guías de iOS. Antes eran ~32 px (y ~26 px en apaisado), lo
 * que los hacía difíciles de acertar con el pulgar justo en el flujo de voto.
 *
 * Idioma y tema salen de AppContext: no se pasan por props.
 *
 * @param {boolean} showLanguageLabel - Mostrar el código de idioma junto al icono
 * @param {string} className - Clases del contenedor
 */
export default function ThemeLanguageControls({
  showLanguageLabel = true,
  className = 'flex gap-2'
}) {
  const { language, onToggleLanguage, theme, onToggleTheme } = useAppContext();
  const t = useTranslation(language || 'es');

  const buttonClass =
    'inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 ' +
    'theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all ' +
    'hover:theme-border-secondary hover:-translate-y-0.5 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';

  return (
    <div className={className}>
      {onToggleTheme && (
        <button
          type="button"
          onClick={onToggleTheme}
          className={buttonClass}
          title={theme === 'light' ? t('darkTheme') : t('lightTheme')}
          aria-label={t('changeTheme')}
        >
          <ThemeIcon className="w-4 h-4" isDark={theme === 'dark'} />
        </button>
      )}

      {onToggleLanguage && (
        <button
          type="button"
          onClick={onToggleLanguage}
          className={buttonClass}
          title={t('changeLanguage')}
          aria-label={t('changeLanguage')}
        >
          <LanguageIcon className="w-4 h-4" />
          {showLanguageLabel && <span>{(language || 'es').toUpperCase()}</span>}
        </button>
      )}
    </div>
  );
}
