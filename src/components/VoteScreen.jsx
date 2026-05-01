import React, { useState, useEffect } from 'react';
import { useTranslation } from '../data/literals';
import { getGameImage } from '../services/gameImageService';
import { getRandomGradients } from '../utils/gradients';
import GameCard from './GameCard';
import { ScreenLayout } from './layouts';
import { Header, Footer } from './ui';

/**
 * VoteScreen v2 - Refactorizado con componentes modulares
 * Layout: ScreenLayout + Header (progreso) + Grid de juegos + Footer (navegación)
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
  onToggleLanguage,
  theme,
  onToggleTheme
}) {
  const t = useTranslation(language);
  const [gameImages, setGameImages] = useState({});
  const [gameGradients, setGameGradients] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);
  
  const isVoted = !!userVotes[category.id];
  const selectedOption = userVotes[category.id];
  const categoryBg = 'https://media.rawg.io/media/games/56d/56d006318db933179cdee675e37e3f1a.jpg';

  // Validación defensiva
  if (!category || !category.options || category.options.length === 0) {
    return (
      <div className="h-screen theme-gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold theme-text-primary mb-2">Categoría inválida</h1>
          <p className="theme-text-secondary">Sin opciones disponibles.</p>
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

  // Header con progreso y controles
  const headerContent = (
    <Header
      title={category.title}
      progress={`${currentStep + 1} / ${totalSteps}`}
      progressPercentage={progressPercentage}
      subtitle={isVoted 
        ? `${t('yourSelection')}: ${selectedOption?.name}` 
        : t('chooseYourFavorite')}
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
    />
  );

  // Footer con botones de navegación
  const footerContent = (
    <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row w-full">
      <button
        onClick={onPrevious}
        disabled={currentStep === 0}
        className={`flex-1 py-2 sm:py-2.5 px-3 rounded font-semibold text-xs sm:text-sm transition ${
          currentStep === 0
            ? 'theme-card theme-text-tertiary cursor-not-allowed opacity-50'
            : 'theme-card theme-text-secondary hover:theme-border-secondary'
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
  );

  return (
    <ScreenLayout
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
      header={headerContent}
      footer={<Footer>{footerContent}</Footer>}
      backgroundImage={categoryBg}
      showControlBar={false}
      containerClass="h-screen theme-gradient-primary flex flex-col"
    >
      {/* Indicador de carga */}
      {loadingImages && (
        <div className="text-center text-xs sm:text-sm theme-text-tertiary px-4 sm:px-6 lg:px-8 py-2">
          {t('loading')}
        </div>
      )}

      {/* Grid - Contenedor que crece y escala */}
      <main className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex-1 overflow-hidden min-h-0">
          <div className={`grid gap-2 sm:gap-3 md:gap-12 lg:gap-16 h-full auto-rows-max w-full
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
                  key={`${category.id}_${optionId}`}
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
        <div className="mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 theme-card theme-border-primary border rounded text-xs flex-shrink-0">
          <span className={`font-bold ${isVoted ? 'text-green-400' : 'text-amber-400'}`}>
            {isVoted ? t('voted') : t('pending')}
          </span>
        </div>
      </main>
    </ScreenLayout>
  );
}
