import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useAdminCheck, useFirestoreCategories, useFirestoreBallots, useVotingConfig, useSeasonResults, useSeasonControls, useBallotStats } from '../hooks';
import { LoadingSpinner, ThemeLanguageControls } from './ui';
import logger from '../services/loggerService';
import { FALLBACK_ROUTE } from '../utils/routes';
import { authErrorMessage } from '../utils/authErrors';

// Importar pantallas de administración
import CategoryManager from './CategoryManager';
import WinnersPanel from './WinnersPanel';
import LoginScreen from './LoginScreen';

// Pestañas del panel (una por vista)
import OverviewTab from './admin/OverviewTab';
import BallotsTab from './admin/BallotsTab';
import HistoryTab from './admin/HistoryTab';
import SeasonTab from './admin/SeasonTab';

/**
 * AdminPanel v4 - Panel de administración refactorizado
 * Ahora usa hooks custom, componentes UI modulares y literales centralizados
 */
export default function AdminPanel() {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const { isAdmin, currentUser, isLoading: authLoading } = useAdminCheck();
  const { categories, isLoading: categoriesLoading, refetch: refetchCategories } = useFirestoreCategories();
  // `ballots` solo se pide cuando el claim de admin ya está confirmado. Las
  // reglas rechazan la lectura a cualquier otro, pero pedirla antes gastaba una
  // petición fallida por visita a /admin y dejaba el panel reclamando datos que
  // no le corresponden (defensa en profundidad).
  const { ballots, isLoading: ballotsLoading, refetch: refetchBallots } = useFirestoreBallots(isAdmin);
  const votingConfig = useVotingConfig();
  const { results: seasonResults, isLoading: resultsLoading, refetch: refetchResults } = useSeasonResults(isAdmin);

  // La pestaña visible se declara ANTES que los controles del ciclo: su
  // `onClosed` la cambia, y dejar el `useState` debajo metía a `setViewMode` en
  // la zona muerta temporal del callback (la misma trampa que documenta la regla
  // del orden de hooks en CLAUDE.md).
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'ballots' | 'categories' | 'winners' | 'history' | 'season'

  // Calendario de la edición, cierre forzado, publicación y reinicio anual.
  // Las categorías y los votos NO se le pasan: el servicio los lee de Firestore
  // al publicar, que es lo único que garantiza que se archive la edición que se
  // está cerrando y no la que el panel cargó al abrirse.
  const seasonControls = useSeasonControls({
    config: votingConfig,
    t,
    // Cerrar la votación deja SIEMPRE el mismo trabajo pendiente: marcar los
    // ganadores. Llevar allí directamente ahorra el único clic que nunca cambia.
    onClosed: () => setViewMode('winners'),
    // Publicar reescribe media base de datos: el histórico gana una edición, los
    // votos desaparecen y las categorías se quedan sin nominados. Sin recargar
    // las tres cosas, el panel seguiría enseñando la edición ya archivada.
    onPublished: () => {
      refetchResults();
      refetchBallots();
      refetchCategories();
    },
  });

  const [errorMessage, setErrorMessage] = useState('');

  // Recuento de votos y resolutores de nombres: cálculo puro, fuera del
  // componente (ver hooks/useBallotStats.js).
  const { validBallots, statsData, getCategoryTitle, optionDisplay, getSortedBallotSelections } =
    useBallotStats(ballots, categories, language);

  // Guardián de la ruta: un usuario autenticado que NO es admin se va a la
  // página principal. `replace` para no dejar /admin en el historial (el botón
  // "atrás" no debe devolverle a un sitio donde no puede entrar).
  useEffect(() => {
    if (!authLoading && currentUser && !isAdmin) {
      window.location.replace(FALLBACK_ROUTE);
    }
  }, [authLoading, currentUser, isAdmin]);

  /**
   * Manejar login con Google
   */
  const handleLogin = async () => {
    try {
      setErrorMessage('');
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      logger.error('Error al iniciar sesión:', error);
      // Nunca el `error.message` crudo de Firebase: puede llevar detalles
      // internos y llega siempre en inglés (misma tabla que el login público).
      setErrorMessage(authErrorMessage(t, error));
    }
  };

  /**
   * Cerrar sesión
   */
  const handleLogout = async () => {
    await signOut(auth);
  };

  // No autenticado
  if (!authLoading && !currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={authLoading}
        errorMessage={errorMessage}
      />
    );
  }

  // Autenticado pero SIN el claim de admin: fuera del panel, a la página
  // principal. No se muestra ninguna pantalla intermedia (ni 404 ni "sin
  // permiso") para no confirmar que la ruta existe.
  if (!authLoading && currentUser && !isAdmin) {
    return <LoadingSpinner fullScreen />;
  }

  // Cargando
  if (authLoading || categoriesLoading || ballotsLoading) {
    return <LoadingSpinner text={t('loadingData')} fullScreen />;
  }

  // Admin Panel Main View
  return (
    <div className="min-h-screen theme-gradient-primary">
      {/* Header */}
      {/*
        La cabecera se queda fija solo a partir de `md`. En un móvil ocupa casi
        media pantalla (título, controles y siete pestañas repartidas en varias
        filas), así que pegada arriba tapaba los botones del contenido: en 320px
        el de guardar el renombrado quedaba debajo y no se podía pulsar.
      */}
      <div className="theme-header theme-border-primary border-b md:sticky md:top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* `flex-wrap`: en 320px el título y los controles no caben en una
              línea y, sin envolver, empujaban la página a 535px de ancho (scroll
              horizontal en todo el panel). */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black theme-display uppercase theme-text-primary">{t('adminPanel')}</h1>
              <p className="theme-text-secondary text-sm">{t('ballotResults')}</p>
            </div>
            <div className="flex gap-2 sm:gap-4 items-center">
              <ThemeLanguageControls className="flex gap-2 sm:gap-4 items-center" />
              <button
                onClick={handleLogout}
                className="min-h-[44px] py-2 px-4 btn-danger border theme-border-primary rounded-lg font-semibold text-sm transition-all"
              >
                {t('signOut')}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 md:gap-3 flex-wrap overflow-x-auto pb-2">
            {['overview', 'ballots', 'categories', 'winners', 'history', 'season'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`py-2 px-4 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                  viewMode === mode
                    ? 'theme-accent-bg theme-text-inverse'
                    : 'theme-card theme-border-primary border theme-text-secondary hover:theme-border-secondary'
                }`}
              >
                {mode === 'overview' && t('overview')}
                {mode === 'ballots' && t('allBallots')}
                {mode === 'categories' && t('categories')}
                {mode === 'winners' && t('selectWinners')}
                {mode === 'history' && t('history')}
                {mode === 'season' && t('season')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Overview */}
        {viewMode === 'overview' && (
          <OverviewTab
            validBallots={validBallots}
            statsData={statsData}
            getCategoryTitle={getCategoryTitle}
            optionDisplay={optionDisplay}
          />
        )}

        {/* Ballots */}
        {viewMode === 'ballots' && (
          <BallotsTab
            validBallots={validBallots}
            getSortedBallotSelections={getSortedBallotSelections}
            getCategoryTitle={getCategoryTitle}
            optionDisplay={optionDisplay}
          />
        )}

        {/* Categories Manager */}
        {viewMode === 'categories' && (
          <CategoryManager onClose={() => setViewMode('overview')} />
        )}

        {/* Winners Selector, que es además donde la edición se PUBLICA: al
            guardar el último ganador ofrece archivarla (ver WinnersPanel). La
            clasificación no tiene pestaña propia: se ve en ese diálogo y
            después en el Histórico. */}
        {viewMode === 'winners' && <WinnersPanel season={seasonControls} />}

        {/* Histórico de resultados por año */}
        {viewMode === 'history' && (
          <HistoryTab
            seasonResults={seasonResults}
            resultsLoading={resultsLoading}
            onRefresh={refetchResults}
          />
        )}

        {/* Season / Voting control */}
        {viewMode === 'season' && (
          <SeasonTab
            config={votingConfig}
            controls={seasonControls}
            onGoToWinners={() => setViewMode('winners')}
          />
        )}
      </div>
    </div>
  );
}
