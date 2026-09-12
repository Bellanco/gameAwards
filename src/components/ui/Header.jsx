/**
 * Header - Componente de encabezado reutilizable
 * Muestra progreso, título, controles de idioma/tema y contenido personalizado
 */
import { LanguageIcon, ThemeIcon } from '../Icons';
import { useTranslation } from '../../data/literals';

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
  const t = useTranslation(language || 'es');
  const progressWidth = `${progressPercentage || 0}%`;

  return (
    <div className="px-4 sm:px-6 lg:px-8 landscape:px-2 py-3 sm:py-4 relative">
      {/* Controles de idioma y tema - Esquina superior derecha */}
      {(language || theme) && (
        <div className="absolute top-4 right-4 landscape:right-2 flex gap-2 z-50">
          {theme && onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-3 landscape:px-2 py-2 landscape:py-1 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all hover:theme-border-secondary hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              title={theme === 'light' ? t('darkTheme') : t('lightTheme')}
              aria-label={t('changeTheme')}
            >
              <ThemeIcon className="w-4 h-4 landscape:w-3 landscape:h-3" isDark={theme === 'dark'} />
            </button>
          )}
          {language && onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-2 px-3 landscape:px-2 py-2 landscape:py-1 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all hover:theme-border-secondary hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              title={t('changeLanguage')}
              aria-label={t('changeLanguage')}
            >
              <LanguageIcon className="w-4 h-4 landscape:w-3 landscape:h-3" />
              <span className="hidden sm:inline landscape:hidden">{language.toUpperCase()}</span>
            </button>
          )}
        </div>
      )}

      {/* Barra de progreso - Si se proporciona (con margen superior si hay controles) */}
      {progress !== null && (
        <div className={`${language || theme ? 'mt-12 sm:mt-14' : ''} mb-2 sm:mb-3 landscape:mb-1`}>
          <div className="flex justify-between items-center mb-1.5 landscape:mb-0.5 text-sm">
            <span className="font-bold theme-text-secondary uppercase">
              {progress}
            </span>
            {progressPercentage !== null && (
              <span className="font-bold theme-accent">{progressPercentage}%</span>
            )}
          </div>
          <div className="h-1 landscape:h-0.5 theme-bg-overlay-light rounded-full overflow-hidden">
            <div
              className="h-full theme-shine transition-all duration-500"
              style={{
                width: progressWidth,
                backgroundImage: 'linear-gradient(90deg, color-mix(in srgb, var(--color-secondary) 78%, #000000 22%), color-mix(in srgb, var(--color-accent) 84%, #f6d399 16%), color-mix(in srgb, var(--color-secondary) 78%, #000000 22%))'
              }}
            />
          </div>
        </div>
      )}

      {/* Título */}
      <h1 className="text-2xl sm:text-4xl landscape:text-lg font-black tracking-tight theme-display uppercase theme-text-primary mb-2 landscape:mb-1">
        {title}
      </h1>

      {/* Subtítulo - Si se proporciona */}
      {subtitle && (
        <p className="text-base sm:text-lg landscape:text-sm theme-text-secondary mb-4 landscape:mb-1.5">
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
