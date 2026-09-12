import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { getRandomGradients } from '../utils/gradients';
import { getGridColumns } from '../utils/gridDensity';
import { tField, getCategoryTitle, getOptionId, getOptionLabel } from '../utils/localize';
import GameCard from './GameCard';
import { ScreenLayout } from './layouts';
import { Header, Footer } from './ui';
import { trackCategoryViewed } from '../services/analyticsService';

/**
 * Pausa tras seleccionar un nominado, para que el check llegue a verse antes de
 * pasar a la categoría siguiente. Es el ÚNICO retardo del flujo: la navegación
 * con los botones es inmediata.
 */
const SELECTION_FEEDBACK_MS = 120;

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
  onFinish,
  progressPercentage,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const viewportInfo = useViewport();
  const [gameGradients, setGameGradients] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [hasVerticalScroll, setHasVerticalScroll] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollContainerRef = useRef(null);

  // Bloqueo de navegación contra doble pulsación (ghost clicks).
  //
  // Antes se encadenaban tres setTimeout (100 + 100 + 50 ms), así que cada
  // categoría costaba ~250 ms de espera percibida —unos 6 segundos en una porra
  // de 25 categorías— y ninguno se limpiaba al desmontar. Ahora el bloqueo es un
  // ref (inmediato y sin re-render) y solo queda UN retardo, el de la selección,
  // para que dé tiempo a ver el check antes de cambiar de categoría.
  const navigationLock = useRef(false);
  const selectionTimer = useRef(null);

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
    // Al cambiar de categoría se libera el bloqueo de navegación.
    navigationLock.current = false;
    setIsTransitioning(false);
    
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

  // Métrica de embudo: en qué categoría abandona la gente. Va en su propio
  // efecto para no acoplar la analítica al ciclo de los degradados.
  useEffect(() => {
    if (category?.id) trackCategoryViewed(category.id, currentStep + 1, totalSteps);
  }, [category?.id, currentStep, totalSteps]);

  // El temporizador de la selección debe morir con el componente: si no, al
  // salir rápido de la pantalla dispara un setState sobre un árbol desmontado.
  useEffect(() => () => clearTimeout(selectionTimer.current), []);

  // Validación defensiva (tras los hooks, para no alterar su orden entre renders).
  if (!category || !category.options || category.options.length === 0) {
    return (
      <div className="h-screen theme-gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold theme-display uppercase theme-text-primary mb-2">{t('invalidCategory')}</h1>
          <p className="theme-text-secondary">{t('noOptions')}</p>
        </div>
      </div>
    );
  }

  // Columnas de la rejilla según ancho y nº de nominados (ver utils/gridDensity).
  const gridColumns = getGridColumns({
    width: viewportInfo.width,
    optionCount,
    isMobile: viewportInfo.isMobile,
    isLandscape: viewportInfo.isLandscape,
  });

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

  const navigate = (move) => {
    if (navigationLock.current) return;
    navigationLock.current = true;
    setIsTransitioning(true);
    move();
  };

  // Pulsar un botón navega al instante; el bloqueo lo libera el efecto de cambio
  // de categoría.
  const handleNext = () => navigate(onNext);
  const handlePrevious = () => navigate(() => onPrevious());

  const handleSelectOption = (categoryId, option) => {
    if (navigationLock.current) return;
    onSelectOption(categoryId, option);
    // Marcamos el bloqueo YA (impide un segundo toque durante la pausa) pero
    // dejamos que el check se pinte antes de avanzar.
    navigationLock.current = true;
    setIsTransitioning(true);
    selectionTimer.current = setTimeout(onNext, SELECTION_FEEDBACK_MS);
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
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded font-semibold text-sm transition transform ${
            currentStep === 0
              ? 'theme-btn-secondary border cursor-not-allowed opacity-40'
              : 'theme-btn-secondary border hover:scale-105 theme-shadow-md'
          }`}
        >
          {t('previous')}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStep === totalSteps - 1}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded font-bold text-sm transition transform ${
            currentStep === totalSteps - 1
              ? 'theme-card theme-text-tertiary cursor-not-allowed opacity-50'
              : 'theme-btn-primary hover:scale-105'
          }`}
        >
          {t('next')}
        </button>
      </div>

      {/* Fila 2: Finalizar */}
      <button
        onClick={onFinish}
        className="flex-1 py-2 sm:py-2.5 px-3 rounded font-bold btn-success text-sm transition-colors"
      >
        {t('finish')}
      </button>
    </div>
  );

  return (
    <ScreenLayout
      header={headerContent}
      footer={<Footer>{footerContent}</Footer>}
      backgroundImage=""
      showControlBar={false}
      containerClass="h-screen theme-gradient-primary flex flex-col"
    >
      {/* Indicador de carga */}
      {loadingImages && (
        <div className="text-center text-sm theme-text-secondary px-4 sm:px-6 lg:px-8 py-2">
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
                  gradient={gameGradients[optionId] || 'bg-gradient-to-br from-zinc-900/60 to-zinc-700/80'}
                  isSelected={isSelected}
                  isMobilePortrait={isMobilePortrait}
                  compact={optionCount > 4 || viewportInfo.isLandscape || gridColumns >= 4}
                  isTransitioning={isTransitioning}
                  onSelect={() =>
                    handleSelectOption(category.id, { id: optionId, name: optionName })
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Status - Compact */}
        <div className="mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 theme-card theme-border-primary border rounded text-sm flex-shrink-0">
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
              className="relative z-10 pb-2 animate-bounce hover:scale-125 transition-transform cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] p-1"
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
