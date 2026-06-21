import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../data/literals';
import { getRandomGradients } from '../utils/gradients';
import { tField, getCategoryTitle, getOptionId, getOptionLabel } from '../utils/localize';
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
  const [viewportInfo, setViewportInfo] = useState({ isMobile: false, isLandscape: false, width: 0 });
  const scrollContainerRef = useRef(null);
  
  const isVoted = !!userVotes[category?.id];
  const selectedOption = userVotes[category?.id];
  const optionCount = category?.options?.length || 0;
  const isMobilePortrait = viewportInfo.isMobile && !viewportInfo.isLandscape;

  // Cargar gradientes cuando cambia la categoría (clave = optionId estable)
  useEffect(() => {
    const optionIds = (category?.options || []).map((opt, idx) => getOptionId(opt, category.id, idx));
    const gradients = getRandomGradients(optionIds);
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
  }, [category?.id, category?.options]);

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
  }, [category?.id, category?.options]);

  // Mantener metadata de viewport para responder a orientación y ancho real
  useEffect(() => {
    const updateViewportInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewportInfo({
        isMobile: width < 768,
        isLandscape: width > height,
        width
      });
    };

    updateViewportInfo();
    window.addEventListener('resize', updateViewportInfo);
    window.addEventListener('orientationchange', updateViewportInfo);

    return () => {
      window.removeEventListener('resize', updateViewportInfo);
      window.removeEventListener('orientationchange', updateViewportInfo);
    };
  }, []);

  // Validación defensiva (tras los hooks, para no alterar su orden entre renders).
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

  // Calibración fina de densidad visual por rango de viewport + cantidad de opciones.
  const gridDensityConfig = (() => {
    const width = viewportInfo.width || 320;

    if (isMobilePortrait) {
      // Evitar saltos bruscos (5 opciones en 2 cols y 6 en 3 cols) en móviles tipo Pixel.
      // En anchos <= 430px mantenemos densidad estable con máximo 2 columnas hasta 8 opciones.
      if (width <= 430) {
        if (optionCount <= 3) return { minCardWidthPx: 180, maxColumns: 2 };
        return { minCardWidthPx: 150, maxColumns: 2 };
      }

      if (optionCount <= 3) return { minCardWidthPx: 190, maxColumns: 2 };
      if (optionCount <= 6) return { minCardWidthPx: 160, maxColumns: 2 };
      return { minCardWidthPx: 145, maxColumns: 3 };
    }

    if (viewportInfo.isMobile && viewportInfo.isLandscape) {
      if (optionCount <= 4) return { minCardWidthPx: 170, maxColumns: 4 };
      if (optionCount <= 8) return { minCardWidthPx: 190, maxColumns: 3 };
      return { minCardWidthPx: 170, maxColumns: 4 };
    }

    if (width < 900) {
      return { minCardWidthPx: viewportInfo.isMobile ? 200 : 220, maxColumns: 2 };
    }

    if (width < 1280) {
      if (optionCount <= 4) return { minCardWidthPx: 260, maxColumns: 2 };
      if (optionCount <= 8) return { minCardWidthPx: 240, maxColumns: 3 };
      return { minCardWidthPx: 220, maxColumns: 4 };
    }

    if (width < 1600) {
      if (optionCount <= 4) return { minCardWidthPx: 280, maxColumns: 4 };
      if (optionCount <= 8) return { minCardWidthPx: 260, maxColumns: 4 };
      return { minCardWidthPx: 240, maxColumns: 5 };
    }

    if (optionCount <= 4) return { minCardWidthPx: 320, maxColumns: 4 };
    if (optionCount <= 8) return { minCardWidthPx: 290, maxColumns: 5 };
    return { minCardWidthPx: 260, maxColumns: 6 };
  })();

  const safeViewportWidth = Math.max(320, (viewportInfo.width || 320) - 24);
  const columnsByWidth = Math.max(1, Math.floor(safeViewportWidth / gridDensityConfig.minCardWidthPx));
  const gridColumns = Math.max(
    1,
    Math.min(optionCount, gridDensityConfig.maxColumns, columnsByWidth)
  );

  const denseLandscapeClass = viewportInfo.isMobile && viewportInfo.isLandscape && optionCount >= 6
    ? 'gap-1.5 sm:gap-2 md:gap-3'
    : 'gap-2 sm:gap-3 md:gap-4 lg:gap-6';

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
      title={getCategoryTitle(category, language)}
      progress={`${currentStep + 1} / ${totalSteps}`}
      progressPercentage={progressPercentage}
      subtitle={isVoted
        ? `${t('yourSelection')}: ${getOptionLabel(category, selectedOption?.id, language)}`
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
          className="flex-1 w-full overflow-y-auto px-2 md:px-3 lg:px-0"
        >
          <div 
            className={`grid w-full auto-rows-fr content-start px-1 sm:px-2 md:px-3 pb-3 sm:pb-4 ${denseLandscapeClass} ${
              viewportInfo.isLandscape && !hasVerticalScroll ? 'my-auto' : ''
            } ${
              isTransitioning ? 'pointer-events-none' : ''
            }`}
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
              transition: 'grid-template-columns 0.25s ease-out'
            }}
          >
            {category.options.map((option, index) => {
              const optionId = getOptionId(option, category.id, index);
              const optionName = tField(option, language);
              const isSelected = selectedOption?.id === optionId;

              return (
                <GameCard
                  key={`${category.id}_${optionId}`}
                  variant="vote"
                  gameName={optionName}
                  gradient={gameGradients[optionId] || 'bg-gradient-to-br from-slate-900/60 to-slate-900/80'}
                  isSelected={isSelected}
                  isMobilePortrait={isMobilePortrait}
                  compact={optionCount > 4 || viewportInfo.isLandscape || gridColumns >= 4}
                  isTransitioning={isTransitioning}
                  onSelect={() => {
                    if (!isTransitioning) {
                      handleSelectOption(category.id, { id: optionId, name: optionName });
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
        {hasVerticalScroll && !isAtBottom && viewportInfo.isMobile && !viewportInfo.isLandscape && (
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
