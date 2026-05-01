import React, { useState, useEffect } from 'react';
import { useTranslation } from '../data/literals';
import { getGameImage } from '../services/gameImageService';
import { getRandomGradients } from '../utils/gradients';
import { categoryBackgrounds } from '../data/gameData';
import { LanguageIcon } from './Icons';
import GameCard from './GameCard';

/**
 * VoteScreen - Patrón responsive clásico
 * Layout: Header (fijo) | Grid (flexible) | Footer (fijo)
 */
export default function VoteScreen({
  category,
  currentStep,
  totalSteps,
  userVotes,
  onSelectOption,
  onPrevious,
  onNext,
  onSkip,
  progressPercentage,
  language,
  onToggleLanguage
}) {
  const t = useTranslation(language);
  const [gameImages, setGameImages] = useState({});
  const [gameGradients, setGameGradients] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);
  
  const isVoted = !!userVotes[category.id];
  const selectedOption = userVotes[category.id];
  const categoryBg = categoryBackgrounds[category.id] || 'https://media.rawg.io/media/games/56d/56d006318db933179cdee675e37e3f1a.jpg';

  // Validación defensiva
  if (!category || !category.options || category.options.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">⚠️ Categoría inválida</h1>
          <p className="text-slate-400">Sin opciones disponibles.</p>
        </div>
      </div>
    );
  }

  // Cargar imágenes cuando cambia la categoría
  useEffect(() => {
    const loadImages = async () => {
      setLoadingImages(true);
      const images = {};
      
      const promises = category.options.map(async (gameName) => {
        try {
          const imageUrl = await getGameImage(gameName);
          images[gameName] = imageUrl;
        } catch (error) {
          console.warn(`Failed to load image for ${gameName}:`, error);
          images[gameName] = `https://via.placeholder.com/400x600/1f2937/ffffff?text=${encodeURIComponent(gameName)}`;
        }
      });

      await Promise.all(promises);
      setGameImages(images);
      const gradients = getRandomGradients(category.options);
      setGameGradients(gradients);
      setLoadingImages(false);
    };

    loadImages();
  }, [category.id, category.options]);

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col">
      {/* HEADER - Fijo */}
      <header className="flex-shrink-0 bg-gradient-to-b from-black/95 to-black/80 border-b border-slate-800 relative z-40">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <img
            src={categoryBg}
            alt={category.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/1920x400/1f2937/666666?text=Category';
            }}
          />
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Barra de progreso */}
          <div className="mb-2 sm:mb-3">
            <div className="flex justify-between items-center mb-1.5 text-xs sm:text-sm">
              <span className="font-bold text-slate-300 uppercase">
                {currentStep + 1} / {totalSteps}
              </span>
              <span className="font-bold text-yellow-400">{progressPercentage}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-black text-white line-clamp-2">
            {category.title}
          </h1>
        </div>

        {/* Selector de idioma */}
        <button
          onClick={onToggleLanguage}
          className="absolute top-3 sm:top-4 right-4 sm:right-6 lg:right-8 flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs sm:text-sm font-semibold transition"
        >
          <LanguageIcon className="w-4 h-4" />
          <span className="hidden xs:inline">{language.toUpperCase()}</span>
        </button>
      </header>

      {/* MAIN - Flexible, crece para llenar espacio */}
      <main className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Subtítulo */}
        <p className="text-xs sm:text-sm text-slate-300 mb-2 flex-shrink-0">
          {isVoted 
            ? `${t('yourSelection')}: ${selectedOption?.name}` 
            : t('chooseYourFavorite')}
        </p>

        {/* Indicador de carga */}
        {loadingImages && (
          <div className="text-center text-xs sm:text-sm text-slate-400 mb-2 flex-shrink-0">
            ⏳ {t('loading')}
          </div>
        )}

        {/* Grid - Contenedor que crece y escala */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className={`grid gap-2 sm:gap-3 md:gap-4 h-full auto-rows-max w-full
            ${category.options.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
              category.options.length === 3 ? 'grid-cols-2 md:grid-cols-3' :
              category.options.length === 4 ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4' :
              category.options.length === 5 ? 'grid-cols-2 md:grid-cols-3' :
              category.options.length === 6 ? 'grid-cols-2 md:grid-cols-3' :
              'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
            style={{ gridAutoRows: '1fr' }}
          >
            {category.options.map((option, index) => {
              const optionId = category.optionIds ? category.optionIds[index] : `${category.id}_option_${index}`;
              const isSelected = selectedOption?.id === optionId;
              const gameImageUrl = gameImages[option] || `https://via.placeholder.com/400x600/1f2937/ffffff?text=${encodeURIComponent(option)}`;

              return (
                <GameCard
                  key={optionId}
                  variant="vote"
                  gameName={option}
                  gameImage={gameImageUrl}
                  gradient={gameGradients[option] || 'bg-gradient-to-br from-slate-900/60 to-slate-900/80'}
                  isSelected={isSelected}
                  onSelect={() => onSelectOption(category.id, { id: optionId, name: option })}
                />
              );
            })}
          </div>
        </div>

        {/* Status - Compact */}
        <div className="mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800/30 border border-slate-700 rounded text-xs flex-shrink-0">
          <span className={`font-bold ${isVoted ? 'text-green-400' : 'text-amber-400'}`}>
            {isVoted ? t('voted') : t('pending')}
          </span>
        </div>
      </main>

      {/* FOOTER - Fijo */}
      <footer className="flex-shrink-0 bg-gradient-to-t from-black to-black/80 border-t border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onPrevious}
            disabled={currentStep === 0}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded font-semibold text-xs sm:text-sm transition ${
              currentStep === 0
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {t('previous')}
          </button>

          <button
            onClick={onNext}
            className="flex-1 py-2 sm:py-2.5 px-3 rounded font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 text-xs sm:text-sm transition transform hover:scale-105"
          >
            {currentStep === totalSteps - 1 ? t('review') : t('next')}
          </button>
        </div>
      </footer>
    </div>
  );
}
