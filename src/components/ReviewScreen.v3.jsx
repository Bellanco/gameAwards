import React, { useEffect, useState } from 'react';
import { useTranslation } from '../data/literals';
import { getGameImage } from '../services/gameImageService';
import { LanguageIcon, MedalGoldIcon, MedalSilverIcon, MedalBronzeIcon } from './Icons';

/**
 * ReviewScreen v3 - Con imágenes dinámicas desde APIs
 */
export default function ReviewScreen({
  categories,
  userVotes,
  userNickname,
  onNicknameChange,
  onSubmit,
  onPrevious,
  isLoading,
  errorMessage,
  canEditNickname,
  language,
  onToggleLanguage
}) {
  const voteCount = Object.keys(userVotes).length;
  const totalCategories = categories.length;
  const isComplete = voteCount === totalCategories;
  const t = useTranslation(language);
  const [gameImages, setGameImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);

  // ============ Carga dinámica de imágenes de votos ============
  useEffect(() => {
    const loadVotedImages = async () => {
      setLoadingImages(true);
      const images = {};
      
      // Cargar imágenes para cada voto
      const votedGames = Object.values(userVotes).filter(Boolean);
      const promises = votedGames.map(async (gameName) => {
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
      setLoadingImages(false);
    };

    loadVotedImages();
  }, [userVotes]);

  // Obtener top 3 votos para mostrar medallas
  const getTopVotes = () => {
    const votes = Object.values(userVotes);
    const voteCounts = {};
    votes.forEach(vote => {
      if (vote) {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
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
        {/* Top 3 Votos con Medallas */}
        {topVotes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
              🏆 {t('topVotes')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topVotes.map((game, index) => {
                const imageUrl = gameImages[game] || `https://via.placeholder.com/300x400/1f2937/ffffff?text=${encodeURIComponent(game)}`;
                const medals = [
                  { icon: MedalGoldIcon, color: 'text-yellow-500', label: '1st' },
                  { icon: MedalSilverIcon, color: 'text-gray-400', label: '2nd' },
                  { icon: MedalBronzeIcon, color: 'text-amber-700', label: '3rd' }
                ];
                const medal = medals[index];
                const MedalIcon = medal.icon;

                return (
                  <div key={game} className="relative group">
                    <div className="relative overflow-hidden rounded-lg shadow-2xl transform transition-transform duration-300 hover:scale-105">
                      <img
                        src={imageUrl}
                        alt={game}
                        className="w-full h-64 object-cover"
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/300x400/1f2937/ffffff?text=${encodeURIComponent(game)}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="font-bold text-white text-sm md:text-base line-clamp-2">
                          {game}
                        </p>
                      </div>
                      {/* Medal Badge */}
                      <div className={`absolute top-3 right-3 ${medal.color} p-2 bg-black/30 rounded-full`}>
                        <MedalIcon className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    </div>
                  </div>
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
            {categories.map(category => {
              const votedGame = userVotes[category.id];
              const imageUrl = votedGame 
                ? gameImages[votedGame] || `https://via.placeholder.com/200x300/1f2937/ffffff?text=${encodeURIComponent(votedGame)}`
                : 'https://via.placeholder.com/200x300/2d3748/666666?text=Not+Voted';

              return (
                <div
                  key={category.id}
                  className={`group cursor-pointer overflow-hidden rounded-lg transition-all transform hover:scale-105 ${
                    votedGame ? 'border-2 border-yellow-500/50' : 'border-2 border-slate-700'
                  }`}
                  onClick={onPrevious}
                >
                  <div className="relative w-full h-48 md:h-64">
                    <img
                      src={imageUrl}
                      alt={category.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200x300/2d3748/666666?text=No+Image';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="font-bold text-white text-xs md:text-sm line-clamp-1">
                        {votedGame || `${t('notVoted')}`}
                      </p>
                      <p className="text-xs text-slate-300 mt-1 opacity-75">
                        {category.title}
                      </p>
                    </div>

                    {/* Status Badge */}
                    {votedGame && (
                      <div className="absolute top-2 right-2 bg-green-500/80 px-2 py-1 rounded text-xs font-bold text-white">
                        {t('voted')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nickname Input */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-12">
          <label className="block text-sm font-bold text-slate-300 mb-3">
            {t('displayName')}
          </label>
          <input
            type="text"
            maxLength="30"
            value={userNickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            disabled={!canEditNickname}
            placeholder={t('enterNickname')}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-yellow-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-2">
            {userNickname.length}/30
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 md:gap-4">
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
          >
            {isLoading ? '⏳ ' + t('submittingBallot') : t('submitBallot')}
          </button>
        </div>

        {/* Status Info */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
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
