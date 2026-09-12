import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../data/literals';
import { getRandomGradients } from '../utils/gradients';
import { hasTitle, getCategoryTitle, getOptionLabel } from '../utils/localize';
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
  userDisplayName,
  onDisplayNameChange,
  onSubmit,
  onPrevious,
  onReturnHome,
  isLoading,
  errorMessage,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme
}) {
  // Filtrar solo categorías válidas (no placeholders, no vacías)
  const validCategories = useMemo(() =>
    categories.filter(cat => !cat.isPlaceholder && hasTitle(cat)),
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

  // Encontrar la primera categoría sin votar
  const firstUnvotedIndex = validCategories.findIndex(cat => !userVotes[cat.id]);
  
  const handleEditVotes = () => {
    if (firstUnvotedIndex !== -1) {
      onPrevious(firstUnvotedIndex);
    } else {
      // Si todas están votadas, volver a la primera
      onPrevious(0);
    }
  };

  // ============ Carga de gradientes (sin imágenes, clave = optionId) ============
  useEffect(() => {
    const votedOptionIds = Object.values(userVotes)
      .filter(Boolean)
      .map(voteData => (typeof voteData === 'object' ? voteData.id : voteData))
      .filter(Boolean);

    const gradients = getRandomGradients(votedOptionIds);
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

  return (
    <ScreenLayout
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
      header={headerContent}
      footer={null}
      showControlBar={false}
    >
      {/* Contenido principal */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col">
        {/* 1. Display Name Input */}
        <div className="theme-card theme-border-primary border rounded-lg p-6 mb-6">
          <label htmlFor="reviewDisplayName" className="block text-sm font-bold theme-text-primary mb-3">
            {t('displayName')}
          </label>
          <input
            id="reviewDisplayName"
            type="text"
            maxLength="50"
            value={userDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={t('enterNickname')}
            className="w-full px-4 py-3 theme-container-secondary border-2 theme-border-primary rounded-lg theme-placeholder focus:outline-none focus:border-status-warning focus-visible:ring-2 focus-visible:ring-status-warning/40 transition-colors"
          />
          <p className="text-sm theme-text-secondary mt-2">
            {userDisplayName.length}/50
          </p>
        </div>

        {/* 2. Warning if incomplete */}
        {!isComplete && (
          <div className="p-4 status-warning rounded-lg mb-8 border border-status-warning">
            <p className="text-sm font-semibold">
              {t('completeVoteInCategory')} {missingVotes} {missingVotes !== 1 ? t('moreCategories') : t('moreCategory')}
            </p>
            <p className="text-sm mt-1 opacity-95">
              {t('mustVoteAllBefore')}
            </p>
          </div>
        )}

        {/* Error de envío (apodo, votos faltantes, plazo, fallo al guardar) */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-4 status-error rounded-lg mb-6 border border-status-error"
          >
            <p className="text-sm font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* 3. Botones de Editar y Enviar */}
        <div className="flex gap-3 md:gap-4 w-full mb-8">
          <button
            onClick={handleEditVotes}
            className="flex-1 py-3 px-4 rounded-lg font-semibold theme-btn-secondary border theme-text-primary transition-all hover:theme-border-secondary"
          >
            {t('editVotes')}
          </button>
          <button
            onClick={onSubmit}
            disabled={!isComplete || isLoading}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              isComplete && !isLoading
                ? 'theme-btn-primary transform hover:scale-105'
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
              const votedName = votedGame ? getOptionLabel(category, votedGame.id, language) : null;

              return (
                <GameCard
                  key={category.id}
                  variant="review"
                  gameName={votedName}
                  gradient={votedGame ? gameGradients[votedGame?.id] || 'bg-gradient-to-br from-stone-900/70 to-slate-700/70' : 'bg-zinc-900/70'}
                  isVoted={!!votedGame}
                  onSelect={() => onPrevious(categoryIndex)}
                  categoryTitle={getCategoryTitle(category, language)}
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
            className="w-full py-3 px-4 rounded-lg font-semibold theme-btn-secondary theme-border-primary border theme-text-primary transition-all hover:theme-border-secondary"
            title={t('cancelVoting')}
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </ScreenLayout>
  );
}
