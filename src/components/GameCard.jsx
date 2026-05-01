import React from 'react';
import { CheckmarkIcon } from './Icons';

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
  statusBadge = null
}) {
  // Variante: VOTE (selección de juegos)
  if (variant === 'vote') {
    return (
      <button
        onClick={onSelect}
        className={`relative rounded-lg overflow-hidden transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-600 border-2 h-20 md:h-48 lg:h-64 w-full ${
          isSelected
            ? 'border-amber-600 shadow-lg shadow-amber-600/50'
            : 'border-slate-700 hover:border-amber-600'
        }`}
      >
        {/* Degradado de fondo */}
        <div className={`absolute inset-0 ${gradient}`} />

        {/* Overlay de selección */}
        <div className={`absolute inset-0 transition-all ${
          isSelected
            ? 'bg-black/20'
            : 'bg-black/40 hover:bg-black/30'
        }`} />

        {/* Checkmark - Solo en desktop */}
        {isSelected && (
          <div className="hidden md:flex absolute top-2 sm:top-3 right-2 sm:right-3 w-6 sm:w-8 h-6 sm:h-8 bg-amber-600 rounded-full items-center justify-center animate-pulse">
            <CheckmarkIcon className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
          </div>
        )}

        {/* Nombre del juego - Centrado siempre */}
        <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3">
          <p className="font-bold text-sm sm:text-lg md:text-xl lg:text-2xl text-white line-clamp-2 text-center">
            {gameName}
          </p>
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
              background: 'linear-gradient(135deg, #95A5A6 0%, #1a1a2e 100%)'
            }}
          />
          
          {/* Overlay con degradado de medalla */}
          {medalGradient && (
            <div className={`absolute inset-0 ${medalGradient}`} />
          )}
          
          {/* Overlay oscuro para contraste de texto */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Nombre del juego */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="font-bold text-white text-base md:text-xl line-clamp-2">
              {gameName}
            </p>
          </div>
          
          {/* Medal Badge */}
          {MedalIcon && (
            <div className="absolute top-3 right-3 p-2 bg-black/30 rounded-full">
              <MedalIcon className="w-6 h-6 md:w-8 md:h-8" style={{ color: medalColor }} />
            </div>
          )}
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
              background: 'linear-gradient(135deg, #2d3748 0%, #1a1a2e 100%)'
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

          {/* Info */}
          <div className="absolute inset-0 md:inset-auto md:bottom-0 md:left-0 md:right-0 flex md:flex-col items-center justify-center md:items-start md:justify-end p-3">
            <p className="font-bold text-white text-sm md:text-base line-clamp-1 text-center md:text-left">
              {gameName || translationLabel}
            </p>
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
