import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../data/literals';
import { getRandomGradients } from '../utils/gradients';
import GameCard from './GameCard';
import { ScreenLayout } from './layouts';
import { Header } from './ui';

/**
 * ReviewScreen v5 - Refactorizado con componentes modulares
 * Pantalla de revisión de votos antes de enviar
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
  onToggleLanguage,
  theme,
  onToggleTheme
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

  // DEBUG - Verificar estado de votos
  // Silently verify vote state (uncomment for debugging)
  // useEffect(() => {
  //   console.log('📋 ReviewScreen - voteCount:', voteCount, 'totalCategories:', totalCategories, 'isComplete:', isComplete, 'userVotes:', userVotes);
  // }, [voteCount, totalCategories, isComplete, userVotes]);
  
  const [gameGradients, setGameGradients] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);

  // ============ Carga de gradientes (sin imágenes) ============
  useEffect(() => {
    // Generar gradientes aleatorios para juegos votados
    const votedGameNames = Object.values(userVotes)
      .filter(Boolean)
      .map(voteData => typeof voteData === 'object' ? voteData.name : voteData)
      .filter(Boolean);
    
    const gradients = getRandomGradients(votedGameNames);
    setGameGradients(gradients);
    
    setLoadingImages(false);
  }, [userVotes]);

  // Header
  const headerContent = (
    <Header
      title={t('reviewYourVotes')}
      subtitle={`${voteCount} ${t('of')} ${totalCategories} ${t('categoriesVoted')}`}
      progress={`${voteCount} / ${totalCategories}`}
      progressPercentage={totalCategories > 0 ? Math.round((voteCount / totalCategories) * 100) : 0}
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
    />
  );

  // Footer vacío - Los botones estarán en el contenido principal
  const footerContent = null;

  return (
    <ScreenLayout
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
      header={headerContent}
      footer={footerContent ? <Footer>{footerContent}</Footer> : null}
      showControlBar={false}
    >
      {/* Contenido principal */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col">
        {/* 1. Display Name Input */}
        <div className="theme-card theme-border-primary border rounded-lg p-6 mb-6">
          <label className="block text-sm font-bold theme-text-secondary mb-3">
            {t('displayName')}
          </label>
          <input
            type="text"
            maxLength="50"
            value={userDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={t('enterNickname')}
            className="w-full px-4 py-3 theme-container-secondary theme-border-primary border rounded-lg theme-text-primary theme-placeholder focus:border-amber-600 focus:outline-none transition-colors"
          />
          <p className="text-xs theme-text-tertiary mt-2">
            {userDisplayName.length}/50
          </p>
        </div>

        {/* 2. Warning if incomplete */}
        {!isComplete && (
          <div className="p-4 status-warning rounded-lg mb-8">
            <p className="text-sm font-semibold">
              {t('completeVoteInCategory')} {missingVotes} {missingVotes !== 1 ? t('moreCategories') : t('moreCategory')}
            </p>
            <p className="text-xs mt-1 opacity-80">
              {t('mustVoteAllBefore')}
            </p>
          </div>
        )}

        {/* 3. Botones de Editar y Enviar */}
        <div className="flex gap-3 md:gap-4 w-full mb-8">
          <button
            onClick={onPrevious}
            className="flex-1 py-3 px-4 rounded-lg font-semibold theme-card theme-border-primary border theme-text-secondary transition-all hover:border-amber-600"
          >
            {t('editVotes')}
          </button>
          <button
            onClick={onSubmit}
            disabled={!isComplete || isLoading}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              isComplete && !isLoading
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-500 hover:to-amber-600 hover:shadow-lg hover:shadow-amber-600/30 transform hover:scale-105'
                : 'theme-card theme-text-tertiary cursor-not-allowed opacity-50'
            }`}
            title={!isComplete ? t('completeAllCategories') : ''}
          >
            {isLoading ? t('submitting') : (isComplete ? t('submitBallot') : `${t('submitBallot')}`)}
          </button>
        </div>

        {/* 4. Grid de votos completo - Todos tus votos */}
        <div className="mb-12">
          <h2 className="text-xl md:text-2xl font-bold theme-text-primary mb-6">
            {t('allVotes')}
          </h2>
          
          {loadingImages && (
            <div className="p-4 theme-card theme-border-primary border rounded-lg text-center mb-6">
              <p className="text-sm theme-text-secondary">
                {t('loading')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {validCategories.map((category, categoryIndex) => {
              const votedGame = userVotes[category.id];

              return (
                <GameCard
                  key={category.id}
                  variant="review"
                  gameName={votedGame?.name}
                  gradient={votedGame ? gameGradients[votedGame?.name] || 'bg-gradient-to-br from-blue-600/80 to-purple-600/80' : 'bg-slate-900/80'}
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

        {/* 5. Cancelar - Botón debug */}
        {onReturnHome && (
          <button
            onClick={onReturnHome}
            className="w-full py-3 px-4 rounded-lg font-semibold theme-card theme-border-primary border theme-text-secondary transition-all hover:border-red-500"
            title={t('cancelVoting')}
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </ScreenLayout>
  );
}
