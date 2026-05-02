import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../data/literals';
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
  onFinish,
  progressPercentage,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme
}) {
  const t = useTranslation(language);
  const [gameGradients, setGameGradients] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [hasVerticalScroll, setHasVerticalScroll] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollContainerRef = useRef(null);
  
  const isVoted = !!userVotes[category.id];
  const selectedOption = userVotes[category.id];

  // Validación defensiva
  if (!category || !category.options || category.options.length === 0) {
    return (
      <div className="h-screen theme-gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold theme-text-primary mb-2">{t('invalidCategory')}</h1>
          <p className="theme-text-secondary">{t('noOptions')}</p>
        </div>
      </div>
    );
  }

  // Cargar gradientes cuando cambia la categoría
  useEffect(() => {
    const gradients = getRandomGradients(category.options);
    setGameGradients(gradients);
    setLoadingImages(false);
    setIsTransitioning(false); // Reset transition state when category changes
    
    // Limpiar cualquier estado de focus de botones anteriores
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'BUTTON') {
      activeElement.blur();
    }
    
    // Verificar scroll cuando cambien las opciones
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const hasScroll = scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight;
        setHasVerticalScroll(hasScroll);
      }
    }, 50);
  }, [category.id, category.options]);

  // Detectar si hay scroll vertical y escuchar scroll
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const hasScroll = scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight;
        setHasVerticalScroll(hasScroll);
      }
    };

    // Listener de scroll para detectar si estamos al final
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Considerar que estamos al final si estamos a menos de 10px del final
        const atBottom = scrollHeight - scrollTop - clientHeight < 10;
        setIsAtBottom(atBottom);
      }
    };

    const container = scrollContainerRef.current;
    if (!container) return;

    // Check inicial inmediato
    checkScroll();

    // ResizeObserver para detectar cambios de tamaño del contenedor
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(container);

    // Listener de scroll
    container.addEventListener('scroll', handleScroll);

    // Recheck después de cargar
    const timeoutId = setTimeout(checkScroll, 100);

    // Recheck en resize de ventana
    const handleWindowResize = () => checkScroll();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleWindowResize);
      clearTimeout(timeoutId);
    };
  }, [category.id, category.options]);

  // Scroll al final
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Manejadores de navegación con protección contra ghost clicks
  const handleNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onNext();
      // Pequeño delay adicional para garantizar que se limpie el estado
      setTimeout(() => setIsTransitioning(false), 50);
    }, 100);
  };

  const handlePrevious = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onPrevious();
      // Pequeño delay adicional para garantizar que se limpie el estado
      setTimeout(() => setIsTransitioning(false), 50);
    }, 100);
  };

  const handleSelectOption = (categoryId, option) => {
    onSelectOption(categoryId, option);
  };

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
    <div className="flex gap-2 sm:gap-3 flex-col w-full px-2 sm:px-3 py-2 sm:py-3">
      {/* Fila 1: Anterior y Siguiente */}
      <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row w-full">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded font-semibold text-xs sm:text-sm transition transform ${
            currentStep === 0
              ? 'bg-slate-700/40 text-slate-500 cursor-not-allowed opacity-40 border border-slate-600/30'
              : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600 hover:scale-105 border border-slate-500/50 shadow-md'
          }`}
        >
          {t('previous')}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStep === totalSteps - 1}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded font-bold text-xs sm:text-sm transition transform ${
            currentStep === totalSteps - 1
              ? 'theme-card theme-text-tertiary cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-500 hover:to-amber-600 hover:scale-105'
          }`}
        >
          {t('next')}
        </button>
      </div>

      {/* Fila 2: Finalizar */}
      <button
        onClick={onFinish}
        className="flex-1 py-2 sm:py-2.5 px-3 rounded font-bold bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 text-xs sm:text-sm transition-colors"
      >
        {t('finish')}
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
      backgroundImage=""
      showControlBar={false}
      containerClass="h-screen theme-gradient-primary flex flex-col"
    >
      {/* Indicador de carga */}
      {loadingImages && (
        <div className="text-center text-xs sm:text-sm theme-text-tertiary px-4 sm:px-6 lg:px-8 py-2">
          {t('loading')}
        </div>
      )}

      {/* Grid - Contenedor que crece y escala con scroll cuando es necesario */}
      <main className="flex-1 overflow-hidden flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 relative">
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 w-full flex flex-col items-center justify-start"
        >
          <div className={`grid gap-1 md:gap-6 lg:gap-8 h-fit w-full auto-rows-max px-2 md:px-3 ${
            isTransitioning ? 'pointer-events-none' : ''
          }
            ${category.options.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
              category.options.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
              category.options.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
              category.options.length === 5 ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5' :
              category.options.length === 6 ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6' :
              'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
            }`}
          >
            {category.options.map((option, index) => {
              const optionId = category.optionIds ? category.optionIds[index] : `${category.id}_option_${index}`;
              const isSelected = selectedOption?.id === optionId;
              const isLastOption = index === category.options.length - 1;

              return (
                <GameCard
                  key={`${category.id}_${optionId}`}
                  variant="vote"
                  gameName={option}
                  gradient={gameGradients[option] || 'bg-gradient-to-br from-slate-900/60 to-slate-900/80'}
                  isSelected={isSelected}
                  compact={category.options.length > 4}
                  isTransitioning={isTransitioning}
                  onSelect={() => {
                    if (!isTransitioning) {
                      handleSelectOption(category.id, { id: optionId, name: option });
                      // Avanzar automáticamente a siguiente categoría o a ReviewScreen
                      setTimeout(() => handleNext(), 100);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Status - Compact */}
        <div className="mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 theme-card theme-border-primary border rounded text-xs flex-shrink-0">
          <span className={`font-bold ${isVoted ? 'text-status-success' : 'text-status-warning'}`}>
            {isVoted ? t('voted') : t('pending')}
          </span>
        </div>

        {/* Indicador de Scroll - Sombra + Flecha (Clickeable) */}
        {hasVerticalScroll && !isAtBottom && (
          <div className="absolute bottom-0 left-0 right-0 h-16 flex flex-col items-center justify-end">
            {/* Sombra degradada */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            
            {/* Flecha animada - Clickeable */}
            <button
              onClick={scrollToBottom}
              className="relative z-10 pb-2 animate-bounce hover:scale-125 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 p-1"
              aria-label="Scroll to bottom"
              title="Pulsa para ver más opciones"
            >
              <svg 
                className="w-5 h-5 text-status-warning drop-shadow-lg"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          </div>
        )}
      </main>
    </ScreenLayout>
  );
}
