import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { useTranslation } from '../data/literals';
import { LanguageIcon, MedalGoldIcon, MedalSilverIcon, MedalBronzeIcon } from './Icons';
import { useAdminCheck, useFirestoreCategories, useFirestoreBallots } from '../hooks';
import { LoadingSpinner } from './ui';

// Importar pantallas de administración
import CategoryManager from './CategoryManager';
import WinnersPanel from './WinnersPanel';
import LoginScreen from './LoginScreen';

/**
 * AdminPanel v4 - Panel de administración refactorizado
 * Ahora usa hooks custom, componentes UI modulares y literales centralizados
 */
export default function AdminPanel({ language = 'es', onToggleLanguage }) {
  const t = useTranslation(language);
  const { isAdmin, currentUser, isLoading: authLoading } = useAdminCheck();
  const { categories, isLoading: categoriesLoading } = useFirestoreCategories();
  const { ballots, isLoading: ballotsLoading } = useFirestoreBallots();
  
  const [statsData, setStatsData] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'results' | 'ballots' | 'categories' | 'winners' | 'ranking'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Calcular estadísticas cuando cambian categorías o votos
  useEffect(() => {
    if (categories.length > 0 && ballots.length > 0) {
      calculateStats(ballots, categories);
    }
  }, [categories, ballots]);

  /**
   * Calcula estadísticas de los votos
   */
  const calculateStats = (ballotsList, categoriesList) => {
    const validCats = categoriesList.filter(cat => 
      !cat.isPlaceholder && cat.title && cat.title.trim()
    );
    const validCatIds = new Set(validCats.map(c => c.id));

    const stats = {};
    ballotsList.forEach(ballot => {
      if (ballot.selections) {
        Object.entries(ballot.selections).forEach(([category, value]) => {
          if (validCatIds.has(category)) {
            if (!stats[category]) stats[category] = {};
            stats[category][value] = (stats[category][value] || 0) + 1;
          }
        });
      }
    });

    setStatsData(stats);
    if (Object.keys(stats).length > 0) {
      setSelectedCategory(Object.keys(stats)[0]);
    }
  };

  /**
   * Obtener ballots válidos
   */
  const getValidBallots = () => {
    const validCatIds = new Set(
      categories
        .filter(c => !c.isPlaceholder && c.title && c.title.trim())
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
    return cat?.title || categoryId;
  };

  /**
   * Obtener ganador y votación de una categoría
   */
  const getWinner = (categoryId) => {
    if (!statsData || !statsData[categoryId]) return null;
    const category = statsData[categoryId];
    const winner = Object.entries(category).sort(([, a], [, b]) => b - a)[0];
    return { name: winner[0], votes: winner[1] };
  };

  /**
   * Descargar datos como JSON
   */
  const downloadJSON = () => {
    const dataStr = JSON.stringify(ballots, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ballots-${new Date().toISOString()}.json`;
    link.click();
  };

  /**
   * Descargar datos como CSV
   */
  const downloadCSV = () => {
    let csv = 'User,Email,Nickname,Submitted At\n';
    ballots.forEach(ballot => {
      csv += `"${ballot.userId || ballot.id}","${ballot.userEmail || ''}","${ballot.userNickname || ''}","${ballot.submittedAt || ''}"\n`;
    });
    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ballots-${new Date().toISOString()}.csv`;
    link.click();
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

  // No autenticado
  if (!authLoading && !currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={authLoading}
        errorMessage={errorMessage}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />
    );
  }

  // Autenticado pero no es admin
  if (!authLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold transition-all"
          >
            <LanguageIcon className="w-4 h-4" />
            <span>{language.toUpperCase()}</span>
          </button>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-4">{t('unauthorized')}</h1>
          <p className="text-slate-400 mb-6">{t('onlyForAdministrators')}</p>
          <p className="text-slate-500 text-sm mb-6">{t('connecting')}: {currentUser?.email}</p>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-all"
          >
            {t('signOut')}
          </button>
        </div>
      </div>
    );
  }

  // Cargando
  if (authLoading || categoriesLoading || ballotsLoading) {
    return <LoadingSpinner text={t('loadingData')} fullScreen />;
  }

  // Admin Panel Main View
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent border-b border-slate-800 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">{t('adminPanel')}</h1>
              <p className="text-slate-400 text-sm">{t('ballotResults')}</p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={onToggleLanguage}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold transition-all"
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
            {['overview', 'results', 'ballots', 'categories', 'winners', 'ranking'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`py-2 px-4 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                  viewMode === mode
                    ? 'bg-yellow-500 text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {mode === 'overview' && t('overview')}
                {mode === 'results' && t('winners')}
                {mode === 'ballots' && t('allBallots')}
                {mode === 'categories' && '📋 ' + t('categories')}
                {mode === 'winners' && '🏆 ' + t('selectWinners')}
                {mode === 'ranking' && '🏆 ' + t('ranking')}
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
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-xs text-slate-400 uppercase mb-2">{t('totalBallots')}</p>
                <p className="text-4xl font-black text-yellow-500">{getValidBallots().length}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-xs text-slate-400 uppercase mb-2">{t('categories')}</p>
                <p className="text-4xl font-black text-yellow-500">{statsData ? Object.keys(statsData).length : 0}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-xs text-slate-400 uppercase mb-2">{t('participation')}</p>
                <p className="text-4xl font-black text-yellow-500">100%</p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex gap-4">
              <button onClick={downloadJSON} className="py-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all">
                {t('downloadJSON')}
              </button>
              <button onClick={downloadCSV} className="py-3 px-6 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all">
                {t('downloadCSV')}
              </button>
            </div>

            {/* Results by Category */}
            {statsData && (
              <div>
                <h2 className="text-2xl font-black text-white mb-6">{t('resultsByCategory')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(statsData).map(([category, votes]) => {
                    const winner = Object.entries(votes).sort(([, a], [, b]) => b - a)[0];
                    return (
                      <div key={category} className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 hover:border-yellow-500/50 transition-all cursor-pointer" onClick={() => { setViewMode('results'); setSelectedCategory(category); }}>
                        <h3 className="text-lg font-bold text-yellow-400 mb-4">{getCategoryTitle(category)}</h3>
                        <div className="space-y-2">
                          {Object.entries(votes).sort(([, a], [, b]) => b - a).slice(0, 3).map(([option, count], idx) => (
                            <div key={option} className="flex justify-between items-center">
                              <span className={`text-sm flex items-center gap-2 ${idx === 0 ? 'text-yellow-400 font-bold' : 'text-slate-300'}`}>
                                {idx === 0 && <MedalGoldIcon className="w-4 h-4" />}
                                {idx === 1 && <MedalSilverIcon className="w-4 h-4" />}
                                {idx === 2 && <MedalBronzeIcon className="w-4 h-4" />}
                                {option}
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

        {/* Results */}
        {viewMode === 'results' && statsData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
                <div className="aspect-video bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-6xl mb-4 animate-bounce">🏆</div>
                    <p className="text-white text-xl font-bold text-center px-4">{t('theWinners')}</p>
                    <p className="text-yellow-200 text-sm mt-2">
                      {selectedCategory && getWinner(selectedCategory) ? getWinner(selectedCategory).name : t('selectACategory')}
                    </p>
                  </div>
                </div>
                {selectedCategory && statsData[selectedCategory] && (
                  <div className="p-6 bg-slate-900 border-t border-slate-700">
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 uppercase mb-2">{t('categoryLabel')}</p>
                      <h3 className="text-2xl font-black text-yellow-400">{getCategoryTitle(selectedCategory)}</h3>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase mb-2">{t('winner')}</p>
                      <p className="text-xl font-bold text-white mb-2">{getWinner(selectedCategory)?.name}</p>
                      <p className="text-sm text-slate-300">🏆 {getWinner(selectedCategory)?.votes} {t('votes')}</p>
                    </div>
                  </div>
                )}
              </div>
              {selectedCategory && statsData[selectedCategory] && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-white mb-4">{t('top3')}</h3>
                  <div className="space-y-2">
                    {Object.entries(statsData[selectedCategory]).sort(([, a], [, b]) => b - a).slice(0, 3).map(([option, votes], idx) => (
                      <div key={option} className={`p-4 rounded-lg border transition-all ${idx === 0 ? 'bg-yellow-500/10 border-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-slate-800/30 border-slate-700'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold flex items-center gap-2">
                            {idx === 0 && <MedalGoldIcon className="w-5 h-5 text-yellow-500" />}
                            {idx === 1 && <MedalSilverIcon className="w-5 h-5 text-gray-400" />}
                            {idx === 2 && <MedalBronzeIcon className="w-5 h-5 text-amber-700" />}
                            {option}
                          </span>
                          <span className="text-yellow-400 font-bold text-xl">{votes}</span>
                        </div>
                        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                            style={{ width: `${(votes / Math.max(...Object.values(statsData[selectedCategory]))) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-6">{t('categories')}</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {statsData && Object.keys(statsData).map(category => {
                    const winner = getWinner(category);
                    const isSelected = selectedCategory === category;
                    return (
                      <button key={category} onClick={() => setSelectedCategory(category)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${isSelected ? 'bg-yellow-500/10 border-yellow-500 shadow-lg' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`}>
                        <p className={`text-sm font-semibold mb-1 ${isSelected ? 'text-yellow-400' : 'text-slate-300'}`}>
                          {getCategoryTitle(category)}
                        </p>
                        <p className="text-xs text-slate-400">{t('winner')}: {winner?.name.substring(0, 20)}...</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-lg p-6">
                  <h3 className="text-sm font-bold text-yellow-400 uppercase mb-4">{t('summary')}</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span>{t('totalVotes')}:</span>
                      <span className="font-bold text-yellow-400">{getValidBallots().length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('categories')}:</span>
                      <span className="font-bold text-yellow-400">{statsData ? Object.keys(statsData).length : 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ballots */}
        {viewMode === 'ballots' && (
          <div>
            <h2 className="text-2xl font-black text-white mb-6">{t('allBallots')}</h2>
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60 border-b border-slate-700">
                  <tr>
                    <th className="text-left p-4">{t('email')}</th>
                    <th className="text-left p-4">{t('nickname')}</th>
                    <th className="text-left p-4">{t('submitted')}</th>
                    <th className="text-left p-4">{t('votes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {getValidBallots().map(ballot => (
                    <tr key={ballot.userId} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">{ballot.userEmail || '-'}</td>
                      <td className="p-4 font-semibold">{ballot.userDisplayName || ballot.userNickname || '-'}</td>
                      <td className="p-4 text-xs text-slate-400">
                        {ballot.submittedAt ? new Date(ballot.submittedAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-4">
                        <details className="cursor-pointer">
                          <summary className="text-yellow-400 font-semibold hover:text-yellow-300">
                            {t('view')} ({Object.keys(ballot.selections || {}).length})
                          </summary>
                          <div className="mt-2 p-2 bg-slate-900 rounded text-xs font-mono text-slate-300">
                            {Object.entries(ballot.selections || {}).map(([cat, val]) => (
                              <div key={cat}><span className="text-blue-400">{getCategoryTitle(cat)}:</span> {val}</div>
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
      </div>
    </div>
  );
}
