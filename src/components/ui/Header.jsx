/**
 * Header - Componente de encabezado reutilizable
 * Muestra progreso, título, controles de idioma/tema y contenido personalizado
 */
import ThemeLanguageControls from './ThemeLanguageControls';

export default function Header({
  title,
  subtitle = null,
  progress = null,
  progressPercentage = null,
  children = null,
  showControls = true
}) {
  const progressWidth = `${progressPercentage || 0}%`;

  return (
    <div className="px-4 sm:px-6 lg:px-8 short:px-2 py-2 sm:py-4 relative">
      {/* Controles de idioma y tema - Esquina superior derecha */}
      {showControls && (
        <ThemeLanguageControls
          showLanguageLabel={false}
          className="absolute top-4 right-4 short:right-2 flex gap-2 z-50"
        />
      )}

      {/* Barra de progreso - Si se proporciona (con margen superior si hay controles) */}
      {progress !== null && (
        <div className={`${showControls ? 'mt-12 sm:mt-14' : ''} mb-2 sm:mb-3 short:mb-1`}>
          <div className="flex justify-between items-center mb-1.5 short:mb-0.5 text-sm">
            <span className="font-bold theme-text-secondary uppercase">
              {progress}
            </span>
            {progressPercentage !== null && (
              <span className="font-bold theme-accent">{progressPercentage}%</span>
            )}
          </div>
          <div className="h-1 short:h-0.5 theme-bg-overlay-light rounded-full overflow-hidden">
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
      <h1 className="text-xl sm:text-4xl short:text-lg font-black tracking-tight theme-display uppercase theme-text-primary mb-1 sm:mb-2 short:mb-1">
        {title}
      </h1>

      {/* Subtítulo - Si se proporciona */}
      {subtitle && (
        <p className="text-sm sm:text-lg short:text-sm theme-text-secondary mb-2 sm:mb-4 short:mb-1.5">
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
