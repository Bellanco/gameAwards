import React, { useState, useEffect, useMemo } from 'react';
import { auth, googleProvider } from '../firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useAdminCheck, useFirestoreCategories, useFirestoreBallots, useVotingConfig, useSeasonResults, useSeasonControls } from '../hooks';
import { sortCategoriesByOrder } from '../services/categoriesService';
import { getCategoryTitle as localizeCategoryTitle, getOptionLabel, hasTitle } from '../utils/localize';
import { LoadingSpinner, ThemeLanguageControls } from './ui';
import logger from '../services/loggerService';
import { FALLBACK_ROUTE } from '../utils/routes';

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
  const { categories, isLoading: categoriesLoading } = useFirestoreCategories();
  const { ballots, isLoading: ballotsLoading } = useFirestoreBallots();
  const votingConfig = useVotingConfig();
  const { results: seasonResults, isLoading: resultsLoading } = useSeasonResults();

  // Calendario de la edición, cierre forzado, publicación y reinicio anual.
  const seasonControls = useSeasonControls({
    config: votingConfig,
    categories,
    ballots,
    t,
  });

  const [statsData, setStatsData] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'ballots' | 'categories' | 'winners' | 'ranking' | 'history' | 'season'
  const [errorMessage, setErrorMessage] = useState('');

  // Calcular estadísticas cuando cambian categorías o votos
  useEffect(() => {
    if (categories.length > 0 && ballots.length > 0) {
      calculateStats(ballots, categories);
    }
  }, [categories, ballots]);

  // Guardián de la ruta: un usuario autenticado que NO es admin se va a la
  // página principal. `replace` para no dejar /admin en el historial (el botón
  // "atrás" no debe devolverle a un sitio donde no puede entrar).
  useEffect(() => {
    if (!authLoading && currentUser && !isAdmin) {
      window.location.replace(FALLBACK_ROUTE);
    }
  }, [authLoading, currentUser, isAdmin]);

  /**
   * Calcula estadísticas de los votos
   * Mantiene el orden de categoriesList (ordenadas por orderIndex)
   */
  const calculateStats = (ballotsList, categoriesList) => {
    const validCats = categoriesList.filter(cat => !cat.isPlaceholder && hasTitle(cat));
    const validCatIds = new Set(validCats.map(c => c.id));

    // Contar votos para cada categoría
    const voteCounts = {};
    ballotsList.forEach(ballot => {
      if (ballot.selections) {
        Object.entries(ballot.selections).forEach(([category, value]) => {
          if (validCatIds.has(category)) {
            if (!voteCounts[category]) voteCounts[category] = {};
            voteCounts[category][value] = (voteCounts[category][value] || 0) + 1;
          }
        });
      }
    });

    // Crear stats en el orden correcto (por orderIndex de categoriesList)
    const stats = {};
    validCats.forEach(cat => {
      if (voteCounts[cat.id]) {
        stats[cat.id] = voteCounts[cat.id];
      }
    });

    setStatsData(stats);
  };

  /**
   * Votos que cuentan: los que tienen al menos una selección en una categoría
   * válida. Memoizado porque antes se recalculaba (con su Set) tres veces por
   * render.
   */
  const validBallots = useMemo(() => {
    const validCatIds = new Set(
      categories
        .filter(c => !c.isPlaceholder && hasTitle(c))
        .map(c => c.id)
    );
    return ballots.filter(ballot =>
      ballot.selections &&
      Object.keys(ballot.selections).some(catId => validCatIds.has(catId))
    );
  }, [categories, ballots]);

  /**
   * Obtener título de categoría por ID
   */
  const getCategoryTitle = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? localizeCategoryTitle(cat, language) : categoryId;
  };

  // Etiqueta localizada de una opción (optionId) dentro de una categoría.
  const optionDisplay = (categoryId, optionId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? getOptionLabel(cat, optionId, language) : optionId;
  };

  /**
   * Obtener selecciones del ballot ordenadas por orderIndex de categorías
   * Usa la misma función que en el resto de la aplicación
   */
  const getSortedBallotSelections = (ballot) => {
    if (!ballot.selections) return [];
    
    // Obtener categorías ordenadas por orderIndex
    const sortedCats = sortCategoriesByOrder(categories);
    
    // Mapear selecciones manteniendo el orden
    return sortedCats
      .filter(cat => ballot.selections[cat.id])
      .map(cat => [cat.id, ballot.selections[cat.id]]);
  };

  /**
   * Manejar login con Google
   */
  const handleLogin = async () => {
    try {
      setErrorMessage('');
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      logger.error('Error al iniciar sesión:', error);
      setErrorMessage(error.message || 'Error al iniciar sesión');
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
      <div className="theme-header theme-border-primary border-b sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black theme-display uppercase theme-text-primary">{t('adminPanel')}</h1>
              <p className="theme-text-secondary text-sm">{t('ballotResults')}</p>
            </div>
            <div className="flex gap-4 items-center">
              <ThemeLanguageControls className="flex gap-4 items-center" />
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
            {['overview', 'ballots', 'categories', 'winners', 'ranking', 'history', 'season'].map(mode => (
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
                {mode === 'ranking' && t('ranking')}
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

        {/* Winners Selector */}
        {viewMode === 'winners' && (
          <WinnersPanel mode="select" />
        )}

        {/* Ranking */}
        {viewMode === 'ranking' && (
          <WinnersPanel mode="ranking" />
        )}

        {/* Histórico de resultados por año */}
        {viewMode === 'history' && (
          <HistoryTab seasonResults={seasonResults} resultsLoading={resultsLoading} />
        )}

        {/* Season / Voting control */}
        {viewMode === 'season' && (
          <SeasonTab config={votingConfig} controls={seasonControls} />
        )}
      </div>
    </div>
  );
}
