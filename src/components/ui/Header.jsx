/**
 * Header - Componente de encabezado reutilizable
 * Muestra progreso, título, controles de idioma/tema y contenido personalizado
 */
import { LanguageIcon, ThemeIcon } from '../Icons';

export default function Header({
  title,
  subtitle = null,
  progress = null,
  progressPercentage = null,
  children = null,
  language = null,
  onToggleLanguage = null,
  theme = null,
  onToggleTheme = null
}) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative">
      {/* Controles de idioma y tema - Esquina superior derecha */}
      {(language || theme) && (
        <div className="absolute top-4 right-4 flex gap-2 z-50">
          {theme && onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-3 py-2 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all hover:border-yellow-500"
              title={theme === 'light' ? 'Tema Oscuro' : 'Tema Claro'}
              aria-label="Toggle theme"
            >
              <ThemeIcon className="w-4 h-4" isDark={theme === 'dark'} />
            </button>
          )}
          {language && onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-2 px-3 py-2 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all hover:border-yellow-500"
              title="Toggle Language"
              aria-label="Toggle language"
            >
              <LanguageIcon className="w-4 h-4" />
              <span>{language.toUpperCase()}</span>
            </button>
          )}
        </div>
      )}

      {/* Barra de progreso - Si se proporciona (con margen superior si hay controles) */}
      {progress !== null && (
        <div className={`${language || theme ? 'mt-12 sm:mt-14' : ''} mb-2 sm:mb-3`}>
          <div className="flex justify-between items-center mb-1.5 text-xs sm:text-sm">
            <span className="font-bold theme-text-secondary uppercase">
              {progress}
            </span>
            {progressPercentage !== null && (
              <span className="font-bold theme-accent">{progressPercentage}%</span>
            )}
          </div>
          <div className="h-1 theme-bg-overlay-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${progressPercentage || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Título */}
      <h1 className="text-2xl sm:text-4xl font-black tracking-tight theme-text-primary mb-2">
        {title}
      </h1>

      {/* Subtítulo - Si se proporciona */}
      {subtitle && (
        <p className="text-base sm:text-lg theme-text-secondary mb-4">
          {subtitle}
        </p>
      )}

      {/* Contenido adicional - Si se proporciona */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
