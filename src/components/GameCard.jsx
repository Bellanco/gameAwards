import React from 'react';
import AutoSizeText from './AutoSizeText';

/**
 * GameCard - Componente reutilizable para mostrar tarjetas de juegos
 * Soporta 3 variantes - Sin carga de imágenes, solo gradientes
 * 1. "vote" - Para seleccionar juegos en VoteScreen
 * 2. "medal" - Para mostrar Top 3 en ReviewScreen
 * 3. "review" - Para mostrar votos en el grid de ReviewScreen
 *
 * `maxHeightPx` (solo en "vote") es el alto que le toca a la tarjeta en la
 * rejilla: la proporción manda mientras quepa, pero en pantallas anchas y bajas
 * (portátiles, tablets apaisadas) una tarjeta de 3 columnas se iría a 200px de
 * alto y obligaría a hacer scroll para ver la última fila.
 *
 * `fillHeight` hace que la tarjeta deje de fijar su alto por proporción y llene
 * la celda que le da la rejilla, siempre sin pasar de `maxHeightPx` (su alto
 * natural). Así, cuando sobra sitio conserva su forma y cuando falta se encoge,
 * en vez de salirse de la celda y solaparse con la fila de abajo. Es lo que
 * quita el scroll en móviles pequeños y evita el recorte en ventanas bajas.
 */
export default function GameCard({
  gameName,
  gradient,
  variant = 'vote',
  isSelected = false,
  isVoted = false,
  onSelect = null,
  MedalIcon = null,
  medalColor = null,
  categoryTitle = null,
  translationLabel = null,
  statusBadge = null,
  compact = false,
  isMobilePortrait = false,
  isTransitioning = false,
  maxHeightPx = null,
  fillHeight = false
}) {
  // Variante: VOTE (selección de juegos)
  if (variant === 'vote') {
    const sizeClass = isMobilePortrait
      ? (compact
        ? 'aspect-4/3 min-h-20 sm:min-h-22 md:min-h-24'
        : 'aspect-5/4 min-h-21 sm:min-h-23 md:min-h-26')
      : (compact
        ? 'aspect-16/7 min-h-15 sm:min-h-18 md:min-h-24 lg:min-h-28'
        : 'aspect-16/8 min-h-18 sm:min-h-21 md:min-h-28 lg:min-h-34');
    const autoSizeMinSize = compact ? 9 : 10;
    const autoSizeMaxSize = compact ? 22 : 30;
    const paddingClass = compact ? 'p-1 sm:p-2 md:p-3' : 'p-2 sm:p-3 md:p-4';

    return (
      <button
        onClick={() => !isTransitioning && onSelect && onSelect()}
        disabled={isTransitioning}
        aria-pressed={isSelected}
        style={maxHeightPx ? { maxHeight: `${maxHeightPx}px` } : undefined}
        className={`relative rounded-lg overflow-hidden border-2 ${sizeClass} w-full select-none transition-transform duration-200
          ${isTransitioning 
            ? 'pointer-events-none cursor-not-allowed' 
            : 'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-accent) cursor-pointer hover:scale-[1.01]'
          }
          ${isSelected
            ? 'theme-accent-border ring-2 ring-(--color-accent)/50 shadow-lg shadow-[rgba(118,81,33,0.45)]'
            : 'theme-border-empty'
          }
          ${isTransitioning ? 'scale-100 theme-border-empty' : ''}
        `}
      >
        {/* Degradado de fondo */}
        <div className={`absolute inset-0 ${gradient}`} />

        {/* Overlay de selección */}
        <div className={`absolute inset-0 transition-all ${
          isSelected
            ? 'bg-black/10'
            : 'bg-black/40'
        }`} />

        {/* Marca de seleccionado: una franja de acento pegada al borde inferior.
            Antes era un círculo con un check en la esquina superior derecha, que
            en tarjetas pequeñas se montaba justo encima de la primera línea del
            nombre («Clair Obscur:» quedaba tapado). La franja ocupa un borde,
            nunca el área del texto. */}
        {isSelected && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1.5 theme-accent-bg theme-flicker"
          />
        )}

        {/* Nombre del juego - Centrado siempre con auto-resize */}
        <div className={`absolute inset-0 flex items-center justify-center ${paddingClass}`}>
          <AutoSizeText minSize={autoSizeMinSize} maxSize={autoSizeMaxSize} stepGranularity={1}>
            {gameName}
          </AutoSizeText>
        </div>
      </button>
    );
  }

  // Variante: MEDAL (Top 3 con medallas)
  if (variant === 'medal') {
    return (
      <div className={`relative group border-2 rounded-lg overflow-hidden shadow-lg`}
        style={{ borderColor: medalColor }}>
        <div className="relative overflow-hidden rounded-lg shadow-2xl transform transition-transform duration-300 hover:scale-105">
          {/* Degradado de fondo */}
          <div 
            className="w-full h-64 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, var(--color-secondary) 0%, var(--color-tertiary) 100%)`
            }}
          >
          {/* Overlay oscuro para contraste de texto */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Nombre del juego con auto-resize */}
          <div className="absolute bottom-0 left-0 right-0 p-4 h-20 flex items-center">
            <AutoSizeText minSize={12} maxSize={20} stepGranularity={1}>
              {gameName}
            </AutoSizeText>
          </div>
          
          {/* Medal Badge */}
          {MedalIcon && (
            <div className="absolute top-3 right-3 p-2 bg-black/30 rounded-full">
              <MedalIcon className="w-6 h-6 md:w-8 md:h-8" style={{ color: medalColor }} />
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  // Variante: REVIEW (Grid de votos en resumen)
  if (variant === 'review') {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={categoryTitle || gameName || translationLabel || undefined}
        className={`group cursor-pointer overflow-hidden rounded-lg transition-all transform hover:scale-105 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-accent) ${
          isVoted ? 'border-2 theme-accent-border' : 'border-2 border-status-warning shadow-lg shadow-[rgba(141,79,19,0.24)]'
        }`}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.();
          }
        }}
      >
        <div className="relative w-full h-20 md:h-48 lg:h-64 flex md:block items-center">
          {/* Degradado de fondo */}
          <div 
            className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{
              background: isVoted 
                ? `linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)`
                : `linear-gradient(135deg, var(--bg-unvoted) 0%, var(--bg-secondary) 100%)`
            }}
          />
          
          {/* Overlay con degradado */}
          {gradient && (
            <div className={`absolute inset-0 ${gradient}`} />
          )}
          
          {isVoted && (
            <>
              {/* Overlay oscuro para contraste - solo si tiene voto */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
            </>
          )}

          {/* Info con auto-resize */}
          <div className="absolute inset-0 md:inset-auto md:bottom-0 md:left-0 md:right-0 flex md:flex-col items-center justify-center md:items-start md:justify-end p-3">
            <div className="w-full h-8 md:h-12 flex items-center justify-center md:justify-start">
              <AutoSizeText minSize={11} maxSize={16} stepGranularity={1}>
                {gameName || translationLabel}
              </AutoSizeText>
            </div>
            {categoryTitle && (
              <p className="hidden md:block text-sm theme-text-secondary mt-1 opacity-85">
                {categoryTitle}
              </p>
            )}
          </div>

          {/* Status Badge */}
          {isVoted && statusBadge && (
            <div className="hidden md:block absolute top-2 right-2 status-success px-2 py-1 rounded-sm text-sm font-bold">
              {statusBadge}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
