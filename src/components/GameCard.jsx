import React from 'react';
import { CheckmarkIcon } from './Icons';
import AutoSizeText from './AutoSizeText';

/**
 * GameCard - Componente reutilizable para mostrar tarjetas de juegos
 * Soporta 3 variantes - Sin carga de imágenes, solo gradientes
 * 1. "vote" - Para seleccionar juegos en VoteScreen
 * 2. "medal" - Para mostrar Top 3 en ReviewScreen
 * 3. "review" - Para mostrar votos en el grid de ReviewScreen
 */
export default function GameCard({
  gameName,
  gradient,
  variant = 'vote',
  isSelected = false,
  isVoted = false,
  onSelect = null,
  medalIndex = null,
  MedalIcon = null,
  medalColor = null,
  medalGradient = null,
  categoryTitle = null,
  translationLabel = null,
  statusBadge = null,
  compact = false,
  isTransitioning = false
}) {
  // Variante: VOTE (selección de juegos)
  if (variant === 'vote') {
    const heightClass = compact ? 'h-12 sm:h-20 md:h-48 lg:h-64' : 'h-20 sm:h-24 md:h-48 lg:h-64';
    const autoSizeMinSize = compact ? 8 : 10;
    const autoSizeMaxSize = compact ? 18 : 28;
    const paddingClass = compact ? 'p-1 sm:p-2' : 'p-2 sm:p-3';

    return (
      <button
        onClick={() => !isTransitioning && onSelect && onSelect()}
        disabled={isTransitioning}
        className={`relative rounded-lg overflow-hidden border-2 ${heightClass} w-full select-none
          ${isTransitioning 
            ? 'pointer-events-none cursor-not-allowed' 
            : 'transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer'
          }
          ${isSelected
            ? 'border-amber-600 shadow-lg shadow-amber-600/50'
            : 'border-slate-700 hover:border-amber-600'
          }
          ${isTransitioning ? 'scale-100 border-slate-700' : ''}
        `}
      >
        {/* Degradado de fondo */}
        <div className={`absolute inset-0 ${gradient}`} />

        {/* Overlay de selección */}
        <div className={`absolute inset-0 transition-all ${
          isSelected
            ? 'bg-black/20'
            : 'bg-black/40 hover:bg-black/30'
        }`} />

        {/* Checkmark - Visible en todos los tamaños */}
        {isSelected && (
          <div className="flex absolute top-1 sm:top-2 md:top-3 right-1 sm:right-2 md:right-3 w-5 sm:w-6 md:w-8 h-5 sm:h-6 md:h-8 bg-amber-600 rounded-full items-center justify-center animate-pulse">
            <CheckmarkIcon className="w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5 text-white" />
          </div>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
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
        className={`group cursor-pointer overflow-hidden rounded-lg transition-all transform hover:scale-105 ${
          isVoted ? 'border-2 border-amber-600/50' : 'border-2 border-red-500/60 shadow-lg shadow-red-500/20'
        }`}
        onClick={onSelect}
      >
        <div className="relative w-full h-20 md:h-48 lg:h-64 flex md:block items-center">
          {/* Degradado de fondo */}
          <div 
            className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)`
            }}
          />
          
          {/* Overlay con degradado */}
          {gradient && (
            <div className={`absolute inset-0 ${gradient}`} />
          )}
          
          {isVoted && (
            <>
              {/* Overlay oscuro para contraste - solo si tiene voto */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
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
              <p className="hidden md:block text-xs text-slate-300 mt-1 opacity-75">
                {categoryTitle}
              </p>
            )}
          </div>

          {/* Status Badge */}
          {isVoted && statusBadge && (
            <div className="hidden md:block absolute top-2 right-2 bg-green-500/80 px-2 py-1 rounded text-xs font-bold text-white">
              {statusBadge}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
