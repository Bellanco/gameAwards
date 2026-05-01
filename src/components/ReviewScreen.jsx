import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../data/literals';
import { getGameImage } from '../services/gameImageService';
import { getRandomGradients } from '../utils/gradients';
import { LanguageIcon, MedalGoldIcon, MedalSilverIcon, MedalBronzeIcon } from './Icons';
import GameCard from './GameCard';

/**
 * ReviewScreen v4 - Con imágenes dinámicas y displayName editable
 */
export default function ReviewScreen({
  categories,
  userVotes,
  userNickname,
  onNicknameChange,
  userDisplayName,
  onDisplayNameChange,
  onSubmit,
  onPrevious,
  onReturnHome,
  isLoading,
  errorMessage,
  canEditNickname,
  language,
  onToggleLanguage
}) {
  // Filtrar solo categorías válidas (no placeholders, no vacías)
  const validCategories = useMemo(() => 
    categories.filter(cat => 
      !cat.isPlaceholder && cat.title && cat.title.trim()
    ),
    [categories]
  );
  
  // Contar solo votos válidos (que están en validCategories)
  const voteCount = validCategories.filter(cat => userVotes[cat.id]).length;
  const totalCategories = validCategories.length;
  const isComplete = voteCount === totalCategories;
  const missingVotes = totalCategories - voteCount;
  const t = useTranslation(language);
  
  // Log para debugging - mostrar conteos correctos
  console.log(`📋 ReviewScreen: 
    - Categorías recibidas: ${categories.length}
    - Categorías válidas: ${validCategories.length}
    - Votos: ${voteCount}
    - Completo: ${isComplete}
    - Faltan: ${missingVotes}
  `, { categories, validCategories, userVotes });
  
  const [gameImages, setGameImages] = useState({});
  const [gameGradients, setGameGradients] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);

  // ============ Carga dinámica de imágenes de votos ============
  useEffect(() => {
    const loadVotedImages = async () => {
      setLoadingImages(true);
      const images = {};
      
      // Cargar imágenes para cada voto
      const votedGames = Object.values(userVotes).filter(Boolean);
      const promises = votedGames.map(async (voteData) => {
        // Extraer nombre si es objeto, o usar directamente si es string
        const gameName = typeof voteData === 'object' ? voteData.name : voteData;
        if (!images[gameName]) {
          try {
            const imageUrl = await getGameImage(gameName);
            images[gameName] = imageUrl;
            console.log(`✅ Loaded review image for: ${gameName}`);
          } catch (error) {
            console.warn(`Failed to load review image for ${gameName}:`, error);
            images[gameName] = `https://via.placeholder.com/300x400/1f2937/ffffff?text=${encodeURIComponent(gameName)}`;
          }
        }
      });

      await Promise.all(promises);
      setGameImages(images);
      
      // Cargar degradados con nombres de juegos (no objetos)
      const allGameNames = validCategories
        .map(cat => {
          const voteData = userVotes[cat.id];
          return typeof voteData === 'object' ? voteData.name : voteData;
        })
        .filter(Boolean);
      const gradients = getRandomGradients(allGameNames);
      setGameGradients(gradients);
      
      setLoadingImages(false);
    };

    loadVotedImages();
  }, [userVotes]);

  // Obtener top 3 votos para mostrar medallas
  const getTopVotes = () => {
    const votes = Object.values(userVotes).filter(v => v); // Solo votos válidos
    const voteCounts = {};
    votes.forEach(vote => {
      if (vote?.name) {
        voteCounts[vote.name] = (voteCounts[vote.name] || 0) + 1;
      }
    });
    return Object.entries(voteCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  };

  const topVotes = getTopVotes();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      {/* Selector de idioma */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold transition-all"
        >
          <LanguageIcon className="w-4 h-4" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            {t('reviewYourVotes')}
          </h1>
          <p className="text-slate-400 mt-2">
            {voteCount} {t('of')} {totalCategories} {t('categoriesVoted')}
          </p>
          {/* Barra de progreso */}
          <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${(voteCount / totalCategories) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Display Name Input - Editable */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-6">
          <label className="block text-sm font-bold text-slate-300 mb-3">
            {t('displayName')}
          </label>
          <input
            type="text"
            maxLength="50"
            value={userDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={t('enterNickname')}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-yellow-500 focus:outline-none transition-colors"
          />
          <p className="text-xs text-slate-400 mt-2">
            {userDisplayName.length}/50 • {userDisplayName ? '✓ ' + (language === 'es' ? 'Listo' : 'Ready') : (language === 'es' ? 'Recomendado' : 'Recommended')}
          </p>
        </div>

        {/* Warning if incomplete */}
        {!isComplete && (
          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 mb-6 text-yellow-300 text-sm flex items-start gap-3">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold">
                {language === 'es' 
                  ? `Completa tu voto en ${missingVotes} categoría${missingVotes !== 1 ? 's' : ''} más`
                  : `Complete your vote in ${missingVotes} more category${missingVotes !== 1 ? 'ies' : ''}`}
              </p>
              <p className="text-xs text-yellow-400 mt-1 opacity-80">
                {language === 'es'
                  ? 'Debes votar en todas las categorías antes de enviar tu ballot'
                  : 'You must vote in all categories before submitting your ballot'}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 md:gap-4 mb-12">
          {/* Editar votos */}
          <button
            onClick={onPrevious}
            className="flex-1 py-3 px-4 rounded-lg font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/70 transition-all"
          >
            {t('editVotes')}
          </button>

          {/* Enviar ballot */}
          <button
            onClick={onSubmit}
            disabled={!isComplete || isLoading}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              isComplete && !isLoading
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-lg hover:shadow-yellow-500/30 transform hover:scale-105'
                : 'bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title={!isComplete ? t('completeAllCategories') : ''}
          >
            {isLoading ? '⏳ ' + t('submitting') : (isComplete ? t('submitBallot') : `${t('submitBallot')} (${missingVotes} ${missingVotes !== 1 ? t('remaining') : t('remaining')})`)}
          </button>
        </div>

        {/* Top 3 Votos con Medallas */}
        {topVotes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
              {t('topVotes')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topVotes.map((game, index) => {
                const medals = [
                  { icon: MedalGoldIcon, borderColor: 'border-yellow-500', medalColor: '#EAB308', gradient: 'bg-gradient-to-br from-yellow-600/80 to-amber-600/80' },
                  { icon: MedalSilverIcon, borderColor: 'border-gray-400', medalColor: '#9CA3AF', gradient: 'bg-gradient-to-br from-gray-500/80 to-slate-600/80' },
                  { icon: MedalBronzeIcon, borderColor: 'border-amber-700', medalColor: '#B45309', gradient: 'bg-gradient-to-br from-amber-700/80 to-orange-700/80' }
                ];
                const medal = medals[index];

                return (
                  <GameCard
                    key={game}
                    variant="medal"
                    gameName={game}
                    gameImage={gameImages[game]?.image}
                    medalIndex={index}
                    MedalIcon={medal.icon}
                    medalColor={medal.medalColor}
                    medalGradient={medal.gradient}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Grid de votos completo */}
        <div className="mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
            {t('allVotes')}
          </h2>
          
          {loadingImages && (
            <div className="p-4 bg-slate-800/20 border border-slate-700 rounded-lg text-center mb-6">
              <p className="text-sm text-slate-400">
                ⏳ Cargando imágenes...
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {validCategories.map((category, categoryIndex) => {
              const votedGame = userVotes[category.id];

              return (
                <GameCard
                  key={category.id}
                  variant="review"
                  gameName={votedGame?.name}
                  gameImage={votedGame && gameImages[votedGame?.name]?.image}
                  gradient={votedGame ? gameGradients[votedGame?.name] || 'bg-gradient-to-br from-blue-600/80 to-purple-600/80' : null}
                  isVoted={!!votedGame}
                  onSelect={() => onPrevious(categoryIndex)}
                  categoryTitle={category.title}
                  translationLabel={t('notVoted')}
                  statusBadge={t('voted')}
                />
              );
            })}
          </div>
        </div>

        {/* Cancelar y volver al inicio */}
        {onReturnHome && (
          <button
            onClick={onReturnHome}
            className="w-full py-3 px-4 rounded-lg font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-900/70 transition-all mb-6"
            title={t('cancelVoting')}
          >
            ← {t('cancel')}
          </button>
        )}

        {/* Status Info */}
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>ℹ️ {t('completionStatus')}</strong>
            <br />
            {isComplete ? (
              <span className="text-green-400">✅ {t('readyToSubmit')}</span>
            ) : (
              <span className="text-amber-400">⚠️ {t('missingVotes')}: {totalCategories - voteCount}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
