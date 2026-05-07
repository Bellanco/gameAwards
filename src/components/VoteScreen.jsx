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
  const [cardScale, setCardScale] = useState(1);
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
        // Si no hay scroll, resetear isAtBottom
        if (!hasScroll) {
          setIsAtBottom(false);
        }
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
        // Recalcular si hay scroll disponible
        const hasScroll = scrollHeight > clientHeight;
        setHasVerticalScroll(hasScroll);
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

  // Calcular columnas dinámicamente según tamaño y orientación
  const getGridCols = () => {
    const count = category.options.length;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = height < width;
    
    // En landscape (tablets): máximo 1 fila
    if (isLandscape && width < 1024) {
      // Tablets landscape: intentar 1 fila, máximo 4 columnas
      if (count <= 4) return count;
      if (count <= 6) return 3;
      return 2;
    }
    
    // Desktop: máximo 2 filas
    if (count <= 2) return count; // 1-2: mostrar todos en 1 fila
    if (count <= 3) return 3;     // 3: 1 fila de 3
    if (count <= 4) return 2;     // 4: 2 filas de 2
    if (count <= 6) return 3;     // 5-6: 2 filas de 3
    if (count <= 8) return 4;     // 7-8: 2 filas de 4
    return Math.ceil(count / 2);  // 9+: dividir en 2 filas
  };

  // Calcular tamaño de fuente dinámicamente según viewport (ancho Y altura)
  const calculateCardFontSize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = height < width;
    
    // Móvil vertical (< 768px): considerar ancho y altura
    if (width < 768) {
      const basedOnWidth = width / 22;
      const basedOnHeight = height / 35; // 600px → ~17px, 900px → ~25px
      // Usar el promedio para balance entre ambas dimensiones
      return Math.min(Math.max((basedOnWidth + basedOnHeight) / 2, 8), 20);
    }
    
    // Tablet landscape (768px - 1024px de ancho, altura < ancho): considerar ambas
    if (isLandscape && width < 1024) {
      const basedOnWidth = width / 100;
      const basedOnHeight = height / 80;
      return Math.max(Math.min(basedOnWidth, basedOnHeight), 6); // Mínimo 6px
    }
    
    // Desktop (>= 1024px): considerar ambas dimensiones
    if (width >= 1024) {
      const basedOnWidth = width / 200;
      const basedOnHeight = height / 150;
      return (basedOnWidth + basedOnHeight) / 2 * cardScale;
    }
    
    return 16; // Fallback
  };

  // Calcular gap dinámicamente según viewport
  const calculateGap = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = height < width;
    
    if (width < 768) return '0.25rem'; // Móvil
    if (isLandscape && width < 1024) {
      return height < 900 ? '0.5rem' : '0.75rem'; // Tablet landscape
    }
    return '2rem'; // Desktop
  };

  // Calcular escala de cards basada en el tamaño de la pantalla (solo desktop)
  useEffect(() => {
    const calculateCardScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Solo aplicar escala en desktop (lg breakpoint ≈ 1024px)
      if (width >= 1024) {
        // Escalar según ancho: pantalla 1920px ≈ 1.1x, 2560px ≈ 1.3x
        const widthScale = Math.min(width / 1800, 1.5);
        // Pequeño factor por altura para pantallas muy altas
        const heightScale = Math.min(height / 1200, 1.2);
        const scale = Math.min((widthScale + heightScale) / 2, 1.4);
        setCardScale(scale);
      } else {
        setCardScale(1); // Mobile: sin escala
      }
    };

    calculateCardScale();
    window.addEventListener('resize', calculateCardScale);
    
    return () => window.removeEventListener('resize', calculateCardScale);
  }, [])

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
          className="flex-1 w-full flex flex-col items-center justify-start lg:justify-center px-2 md:px-3 lg:px-0"
          style={{ 
            overflow: window.innerWidth >= 1024 || (window.innerHeight < window.innerWidth && window.innerWidth < 1024) 
              ? 'hidden' 
              : 'auto',
            justifyContent: window.innerHeight < window.innerWidth && window.innerWidth < 1024 ? 'center' : 'flex-start'
          }}
        >
          <div 
            className={`gap-1 md:gap-6 lg:gap-8 h-fit w-full auto-rows-max px-2 md:px-3 ${
              isTransitioning ? 'pointer-events-none' : ''
            }`}
            style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 768 
                ? '1fr' 
                : window.innerWidth < 1024
                  ? `repeat(${getGridCols()}, 1fr)`
                  : `repeat(${getGridCols()}, 1fr)`,
              gap: calculateGap(),
              fontSize: `${calculateCardFontSize()}px`,
              transition: 'grid-template-columns 0.3s ease-out, font-size 0.3s ease-out, gap 0.3s ease-out'
            }}
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

        {/* Indicador de Scroll - Sombra + Flecha (Clickeable) - Solo móvil vertical */}
        {hasVerticalScroll && !isAtBottom && window.innerWidth < 768 && (
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
