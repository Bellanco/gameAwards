import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { getRandomGradients } from '../utils/gradients';
import {
  getGridColumns,
  estimateCardWidth,
  cardHeightFor,
  MIN_CARD_HEIGHT_PX,
  CONTENT_MAX_WIDTH_PX,
} from '../utils/gridDensity';
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
  // Medidas reales del área de rejilla. Con ellas se decide si las tarjetas
  // caben con su proporción o hay que repartir el alto: estimar el ancho a
  // partir del viewport dejaba casos al límite con unos píxeles de scroll.
  const [gridAreaHeight, setGridAreaHeight] = useState(0);
  const [gridAreaWidth, setGridAreaWidth] = useState(0);
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
        setGridAreaHeight(scrollContainerRef.current.clientHeight);
        setGridAreaWidth(scrollContainerRef.current.clientWidth);
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

  // Ancho que le toca de verdad a cada tarjeta: es lo que decide si la tarjeta va
  // en versión compacta, en vez del número de nominados. Cinco opciones en un
  // monitor son tarjetas holgadas; las mismas cinco en una tablet, estrechas.
  const cardWidth = estimateCardWidth({ width: viewportInfo.width, columns: gridColumns });
  const isCompactCard = cardWidth < 230 || (viewportInfo.isMobile && viewportInfo.isLandscape);

  const gridRows = Math.ceil(optionCount / gridColumns);
  // Separación entre tarjetas, en píxeles y en UN solo sitio: la usan el reparto
  // de alturas, el ancho por columna y la propia rejilla. Con clases distintas
  // por breakpoint los tres números se desincronizaban.
  //
  // En móvil son 12px y no 8: con bordes de 2px, ocho píxeles hacen que los
  // bordes de dos filas contiguas se lean como pegados. En móvil apaisado con
  // muchos nominados se aprieta a 8, que ahí lo que falta es alto.
  const rowGapPx = viewportInfo.isMobile && viewportInfo.isLandscape && optionCount >= 6
    ? 8
    : viewportInfo.isMobile
      ? 12
      : 16;
  // Padding inferior propio de la rejilla (`pb-3 sm:pb-4`): hay que descontarlo
  // o el reparto se pasa justo por esos píxeles y reaparece el scroll.
  const gridPaddingPx = viewportInfo.isMobile ? 12 : 16;

  const fitMetrics = {
    areaHeight: gridAreaHeight,
    rows: gridRows,
    gapPx: rowGapPx,
    reservedPx: gridPaddingPx,
  };

  // Proporción máxima de la tarjeta: hasta dónde puede crecer en alto respecto a
  // su ancho. En móvil vertical las tarjetas ya son casi cuadradas; en apaisado
  // y escritorio son panorámicas, pero cuando sobra alto (un monitor con una
  // sola fila) quedarse en 2:1 deja la pantalla medio vacía, así que se las deja
  // engordar hasta ~0.72 del ancho.
  const maxCardRatio = isMobilePortrait
    ? (isCompactCard ? 3 / 4 : 4 / 5)
    : 0.72;
  // Ancho real por tarjeta cuando ya hay medida; si no, la estimación.
  const measuredCardWidth = gridAreaWidth > 0
    ? (gridAreaWidth - rowGapPx * (gridColumns - 1) - gridPaddingPx) / gridColumns
    : cardWidth;
  const cardHeightCap = Math.round(measuredCardWidth * maxCardRatio);

  // Alto que le toca a cada fila repartiendo el área visible.
  const rowHeight = cardHeightFor(fitMetrics);

  // UN SOLO MODO en vez de dos.
  //
  // Antes se elegía entre "proporción fija" y "repartir el alto" con una
  // heurística, y cuando fallaba las tarjetas conservaban su proporción dentro
  // de filas más bajas: se salían de su celda, se solapaban con la de abajo y
  // quedaban cortadas por el borde inferior (se veía en escritorio con la
  // ventana baja). Ahora la rejilla SIEMPRE reparte el alto en filas iguales y
  // la tarjeta llena su celda hasta el tope de proporción: si falta sitio se
  // encoge, si sobra crece hasta ese tope y se centra. No hay desbordamiento
  // posible ni tarjetas diminutas en medio de una pantalla vacía.
  //
  // El scroll solo vuelve cuando ni encogiendo caben tarjetas legibles (muchos
  // nominados en una pantalla diminuta).
  const fitsInViewport = gridAreaHeight > 0 && rowHeight >= MIN_CARD_HEIGHT_PX;
  const cardMaxHeight = fitsInViewport ? Math.min(cardHeightCap, rowHeight) : null;

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
        ? `${t('yourSelection')} ${getOptionLabel(category, selectedOption?.id, language)}`
        : t('chooseYourFavorite')}
    />
  );

  // Footer con botones de navegación
  const footerContent = (
    <div className="flex gap-2 sm:gap-3 flex-col w-full max-w-2xl mx-auto px-2 sm:px-3 py-2 sm:py-3">
      {/* Fila 1: Anterior y Siguiente. En fila también en móvil: apilados se
          comían ~45px de alto, justo los que faltaban para que la rejilla
          cupiera sin scroll en un iPhone SE. */}
      <div className="flex gap-2 sm:gap-3 flex-row w-full">
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
        className="flex-1 py-2 sm:py-2.5 px-3 rounded-sm font-bold btn-success text-sm transition-colors"
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
          className={`flex-1 w-full px-2 md:px-3 lg:px-0 ${
            fitsInViewport ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <div 
            className={`grid w-full auto-rows-fr px-1 sm:px-2 md:px-3 pb-3 sm:pb-4 ${
              fitsInViewport ? 'h-full content-stretch items-center' : 'content-start'
            } ${
              !fitsInViewport && viewportInfo.isLandscape && !hasVerticalScroll ? 'my-auto' : ''
            } ${
              isTransitioning ? 'pointer-events-none' : ''
            }`}
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
              gap: `${rowGapPx}px`,
              // La tarjeta suelta de la última fila se centra con el ancho EXACTO
              // de una columna, que depende del gap (ver más abajo).
              '--card-gap': `${rowGapPx}px`,
              // Con el alto repartido, las filas son iguales y suman exactamente
              // el área visible: es lo que garantiza que no haya scroll.
              ...(fitsInViewport
                ? { gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))` }
                : {}),
              // Tope de ancho: en un monitor ultra-ancho, estirar cinco tarjetas
              // a 500px no mejora la lectura, solo separa el contenido.
              maxWidth: `${CONTENT_MAX_WIDTH_PX}px`,
              marginInline: 'auto',
              transition: 'grid-template-columns 0.25s ease-out'
            }}
          >
            {category.options.map((option, index) => {
              const optionId = getOptionId(option, category.id, index);
              const optionName = tField(option, language);
              const isSelected = selectedOption?.id === optionId;
              // Última fila con una sola tarjeta (5 nominados en 2 columnas):
              // se centra ocupando la fila entera en vez de dejar el hueco
              // pegado a un lado.
              const isLoneLast =
                index === optionCount - 1 &&
                gridColumns > 1 &&
                optionCount % gridColumns === 1;

              return (
                <div
                  key={`${category.id}_${optionId}`}
                  className={`flex h-full min-h-0 items-center ${
                    isLoneLast
                      ? 'col-span-full justify-self-center w-[calc((100%-var(--card-gap))/2)]'
                      : ''
                  }`}
                >
                <GameCard
                  variant="vote"
                  gameName={optionName}
                  gradient={gameGradients[optionId] || 'bg-linear-to-br from-zinc-900/60 to-zinc-700/80'}
                  isSelected={isSelected}
                  isMobilePortrait={isMobilePortrait}
                  compact={isCompactCard || (cardMaxHeight !== null && cardMaxHeight < 96)}
                  maxHeightPx={cardMaxHeight}
                  fillHeight={fitsInViewport}
                  isTransitioning={isTransitioning}
                  onSelect={() =>
                    handleSelectOption(category.id, { id: optionId, name: optionName })
                  }
                />
                </div>
              );
            })}
          </div>
        </div>

        {/* Status - Compact */}
        <div className="mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 theme-card theme-border-primary border rounded-sm text-sm shrink-0 w-full mx-auto" style={{ maxWidth: `${CONTENT_MAX_WIDTH_PX}px` }}>
          <span className={`font-bold ${isVoted ? 'text-status-success' : 'text-status-warning'}`}>
            {isVoted ? t('voted') : t('pending')}
          </span>
        </div>

        {/* Indicador de Scroll - Sombra + Flecha (Clickeable) - Solo móvil vertical */}
        {!fitsInViewport && hasVerticalScroll && !isAtBottom && viewportInfo.isMobile && !viewportInfo.isLandscape && (
          <div className="absolute bottom-0 left-0 right-0 h-16 flex flex-col items-center justify-end">
            {/* Sombra degradada */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black/40 to-transparent pointer-events-none" />
            
            {/* Flecha animada - Clickeable */}
            <button
              onClick={scrollToBottom}
              className="relative z-10 pb-2 animate-bounce hover:scale-125 transition-transform cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-accent) p-1"
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
