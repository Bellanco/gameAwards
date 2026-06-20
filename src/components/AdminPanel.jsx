import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { useTranslation } from '../data/literals';
import { LanguageIcon, ThemeIcon, MedalGoldIcon, MedalSilverIcon, MedalBronzeIcon } from './Icons';
import { useAdminCheck, useFirestoreCategories, useFirestoreBallots, useVotingConfig, useSeasonResults } from '../hooks';
import { sortCategoriesByOrder } from '../services/categoriesService';
import { setVotingOpen, setSeason, archiveAndResetSeason } from '../services/seasonService';
import { getCategoryTitle as localizeCategoryTitle, getOptionLabel, hasTitle } from '../utils/localize';
import { LoadingSpinner } from './ui';

// Importar pantallas de administración
import CategoryManager from './CategoryManager';
import WinnersPanel from './WinnersPanel';
import LoginScreen from './LoginScreen';
import NotFoundScreen from './NotFoundScreen';

/**
 * AdminPanel v4 - Panel de administración refactorizado
 * Ahora usa hooks custom, componentes UI modulares y literales centralizados
 */
export default function AdminPanel({ language = 'es', onToggleLanguage, theme = 'dark', onToggleTheme }) {
  const t = useTranslation(language);
  const { isAdmin, currentUser, isLoading: authLoading } = useAdminCheck();
  const { categories, isLoading: categoriesLoading } = useFirestoreCategories();
  const { ballots, isLoading: ballotsLoading } = useFirestoreBallots();
  const { isOpen: isVotingOpen, season } = useVotingConfig();
  const { results: seasonResults, isLoading: resultsLoading } = useSeasonResults();

  const [statsData, setStatsData] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'ballots' | 'categories' | 'winners' | 'ranking' | 'history' | 'season'
  const [errorMessage, setErrorMessage] = useState('');
  const [seasonBusy, setSeasonBusy] = useState(false);
  const [seasonMessage, setSeasonMessage] = useState('');

  // Calcular estadísticas cuando cambian categorías o votos
  useEffect(() => {
    if (categories.length > 0 && ballots.length > 0) {
      calculateStats(ballots, categories);
    }
  }, [categories, ballots]);

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
   * Obtener ballots válidos
   */
  const getValidBallots = () => {
    const validCatIds = new Set(
      categories
        .filter(c => !c.isPlaceholder && hasTitle(c))
        .map(c => c.id)
    );
    return ballots.filter(ballot => 
      ballot.selections && 
      Object.keys(ballot.selections).some(catId => validCatIds.has(catId))
    );
  };

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
      console.error('Error al iniciar sesión:', error);
      setErrorMessage(error.message || 'Error al iniciar sesión');
    }
  };

  /**
   * Cerrar sesión
   */
  const handleLogout = async () => {
    await signOut(auth);
  };

  /**
   * Abrir / cerrar la votación (config/voting.isOpen).
   */
  const handleToggleVoting = async () => {
    try {
      setSeasonBusy(true);
      setSeasonMessage('');
      await setVotingOpen(!isVotingOpen, { season });
      setSeasonMessage(t('saved'));
      setTimeout(() => setSeasonMessage(''), 2500);
    } catch (err) {
      setSeasonMessage(err.message);
    } finally {
      setSeasonBusy(false);
    }
  };

  /**
   * Archivar resultados de la temporada y reiniciar la edición (borra votos).
   */
  const handleArchiveReset = async () => {
    if (!window.confirm(`${t('archiveResetConfirm')} (${season})`)) return;
    try {
      setSeasonBusy(true);
      setSeasonMessage('');
      const result = await archiveAndResetSeason({ season, categories, ballots });
      // Avanzar a la siguiente temporada con la votación cerrada.
      await setVotingOpen(false, { season: season + 1 });
      setSeasonMessage(`${t('archived')}: ${result.deleted} ${t('votes')} · ${season} → ${season + 1}`);
    } catch (err) {
      setSeasonMessage(err.message);
    } finally {
      setSeasonBusy(false);
    }
  };

  // No autenticado
  if (!authLoading && !currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={authLoading}
        errorMessage={errorMessage}
        language={language}
        onToggleLanguage={onToggleLanguage}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
    );
  }

  // Autenticado pero no es admin - Mostrar 404 para evitar ataques de enumeración
  if (!authLoading && !isAdmin) {
    return (
      <NotFoundScreen
        language={language}
        onToggleLanguage={onToggleLanguage}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onGoHome={() => window.location.href = '/'}
      />
    );
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
              <h1 className="text-3xl md:text-4xl font-black theme-text-primary">{t('adminPanel')}</h1>
              <p className="theme-text-secondary text-sm">{t('ballotResults')}</p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-2 px-3 py-2 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all"
                title={theme === 'light' ? t('darkTheme') : t('lightTheme')}
              >
                <ThemeIcon className="w-4 h-4" isDark={theme === 'dark'} />
              </button>
              <button
                onClick={onToggleLanguage}
                className="flex items-center gap-2 px-3 py-2 theme-card theme-border-primary border rounded-lg text-sm font-semibold transition-all"
              >
                <LanguageIcon className="w-4 h-4" />
                <span>{language.toUpperCase()}</span>
              </button>
              <button
                onClick={handleLogout}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm transition-all"
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
                    ? 'theme-accent-bg text-white'
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
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="theme-card theme-border-primary border rounded-lg p-6">
                <p className="text-xs theme-text-tertiary uppercase mb-2">{t('totalBallots')}</p>
                <p className="text-4xl font-black theme-accent">{getValidBallots().length}</p>
              </div>
              <div className="theme-card theme-border-primary border rounded-lg p-6">
                <p className="text-xs theme-text-tertiary uppercase mb-2">{t('categories')}</p>
                <p className="text-4xl font-black theme-accent">{statsData ? Object.keys(statsData).length : 0}</p>
              </div>
              <div className="theme-card theme-border-primary border rounded-lg p-6">
                <p className="text-xs theme-text-tertiary uppercase mb-2">{t('participation')}</p>
                <p className="text-4xl font-black theme-accent">100%</p>
              </div>
            </div>

            {/* Results by Category */}
            {statsData && (
              <div>
                <h2 className="text-2xl font-black theme-text-primary mb-6">{t('resultsByCategory')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(statsData).map(([category, votes]) => {
                    const winner = Object.entries(votes).sort(([, a], [, b]) => b - a)[0];
                    return (
                      <div key={category} className="theme-card theme-border-primary border rounded-lg p-6">
                        <h3 className="text-lg font-bold theme-accent mb-4">{getCategoryTitle(category)}</h3>
                        <div className="space-y-2">
                          {Object.entries(votes).sort(([, a], [, b]) => b - a).slice(0, 3).map(([option, count], idx) => (
                            <div key={option} className="flex justify-between items-center">
                              <span className={`text-sm flex items-center gap-2 ${idx === 0 ? 'theme-accent font-bold' : 'theme-text-secondary'}`}>
                                {idx === 0 && <MedalGoldIcon className="w-4 h-4" />}
                                {idx === 1 && <MedalSilverIcon className="w-4 h-4" />}
                                {idx === 2 && <MedalBronzeIcon className="w-4 h-4" />}
                                {optionDisplay(category, option)}
                              </span>
                              <span className="font-bold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ballots */}
        {viewMode === 'ballots' && (
          <div>
            <h2 className="text-2xl font-black theme-text-primary mb-6">{t('allBallots')}</h2>
            <div className="theme-card theme-border-primary border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="theme-header theme-border-primary border-b">
                  <tr>
                    <th className="text-left p-4 theme-text-primary">{t('email')}</th>
                    <th className="text-left p-4 theme-text-primary">{t('nickname')}</th>
                    <th className="text-left p-4 theme-text-primary">{t('submitted')}</th>
                    <th className="text-left p-4 theme-text-primary">{t('votes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {getValidBallots().map(ballot => (
                    <tr key={ballot.userId} className="theme-border-primary border-b hover:theme-bg-overlay-light transition-colors">
                      <td className="p-4 theme-text-secondary">{ballot.userEmail || '-'}</td>
                      <td className="p-4 font-semibold theme-text-primary">{ballot.userDisplayName || ballot.userNickname || '-'}</td>
                      <td className="p-4 text-xs theme-text-tertiary">
                        {ballot.submittedAt ? new Date(ballot.submittedAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-4">
                        <details className="cursor-pointer">
                          <summary className="theme-accent font-semibold hover:theme-accent/80">
                            {t('view')} ({Object.keys(ballot.selections || {}).length})
                          </summary>
                          <div className="mt-2 p-2 theme-container-secondary rounded text-xs font-mono theme-text-secondary">
                            {getSortedBallotSelections(ballot).map(([cat, val]) => (
                              <div key={cat}><span className="text-info">{getCategoryTitle(cat)}:</span> {optionDisplay(cat, val)}</div>
                            ))}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories Manager */}
        {viewMode === 'categories' && (
          <CategoryManager language={language} onClose={() => setViewMode('overview')} />
        )}

        {/* Winners Selector */}
        {viewMode === 'winners' && (
          <WinnersPanel mode="select" language={language} onClose={() => setViewMode('overview')} />
        )}

        {/* Ranking */}
        {viewMode === 'ranking' && (
          <WinnersPanel mode="ranking" language={language} onClose={() => setViewMode('overview')} />
        )}

        {/* Histórico de resultados por año */}
        {viewMode === 'history' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black theme-text-primary">{t('history')}</h2>
              <p className="theme-text-secondary text-sm">{t('historyDescription')}</p>
            </div>

            {resultsLoading ? (
              <LoadingSpinner text={t('loadingData')} />
            ) : seasonResults.length === 0 ? (
              <div className="theme-card theme-border-primary border rounded-lg p-8 text-center">
                <p className="theme-text-secondary">{t('noHistory')}</p>
              </div>
            ) : (
              seasonResults.map(edition => {
                const snap = edition.categoriesSnapshot || [];
                const board = edition.leaderboard || [];
                return (
                  <div key={edition.id} className="theme-card theme-border-primary border rounded-lg overflow-hidden">
                    <div className="theme-header theme-border-primary border-b px-6 py-4 flex justify-between items-center">
                      <h3 className="text-2xl font-black theme-accent">{edition.season}</h3>
                      <span className="text-xs theme-text-tertiary">{edition.totalBallots || 0} {t('votes')}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                      {/* Ganadores por categoría */}
                      <div>
                        <h4 className="text-sm font-bold theme-text-secondary uppercase mb-3">{t('winners')}</h4>
                        <div className="space-y-1.5">
                          {snap.filter(c => c.winner).map(cat => (
                            <div key={cat.id} className="flex justify-between gap-3 text-sm">
                              <span className="theme-text-tertiary truncate">{localizeCategoryTitle(cat, language)}</span>
                              <span className="theme-text-primary font-semibold text-right">{getOptionLabel(cat, cat.winner, language)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Clasificación */}
                      <div>
                        <h4 className="text-sm font-bold theme-text-secondary uppercase mb-3">{t('ranking')}</h4>
                        <div className="space-y-1.5">
                          {board.slice(0, 10).map(entry => (
                            <div key={entry.userId} className="flex justify-between gap-3 text-sm">
                              <span className="theme-text-tertiary">
                                {entry.rank === 1 && '🥇 '}{entry.rank === 2 && '🥈 '}{entry.rank === 3 && '🥉 '}
                                {entry.rank > 3 && `${entry.rank}. `}{entry.nickname}
                              </span>
                              <span className="theme-accent font-bold">{entry.points} {t('pts')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Season / Voting control */}
        {viewMode === 'season' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-black theme-text-primary">{t('season')}</h2>
              <p className="theme-text-secondary text-sm">{t('seasonDescription')}</p>
            </div>

            {seasonMessage && (
              <div className="p-3 rounded-lg theme-card theme-border-primary border text-sm theme-text-primary">
                {seasonMessage}
              </div>
            )}

            {/* Estado de la votación */}
            <div className="theme-card theme-border-primary border rounded-lg p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs theme-text-tertiary uppercase mb-1">{t('currentSeason')}</p>
                  <p className="text-3xl font-black theme-accent">{season}</p>
                  <p className={`text-sm font-semibold mt-1 ${isVotingOpen ? 'text-status-success' : 'text-status-error'}`}>
                    {isVotingOpen ? t('votingOpen') : t('votingClosed')}
                  </p>
                </div>
                <button
                  onClick={handleToggleVoting}
                  disabled={seasonBusy}
                  className={`py-3 px-6 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${
                    isVotingOpen
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isVotingOpen ? t('closeVoting') : t('openVoting')}
                </button>
              </div>
            </div>

            {/* Archivar y reiniciar */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-400 mb-2">{t('archiveAndReset')}</h3>
              <p className="theme-text-secondary text-sm mb-4">{t('archiveAndResetDescription')}</p>
              <button
                onClick={handleArchiveReset}
                disabled={seasonBusy}
                className="py-3 px-6 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50"
              >
                {seasonBusy ? t('loadingData') : t('archiveAndReset')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
