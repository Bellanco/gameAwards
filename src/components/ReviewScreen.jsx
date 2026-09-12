import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { getRandomGradients } from '../utils/gradients';
import { hasTitle, getCategoryTitle, getOptionLabel } from '../utils/localize';
import GameCard from './GameCard';
import { ScreenLayout } from './layouts';
import { Header } from './ui';
import { TextInput } from './form';
import { MAX_USER_TEXT_LENGTH } from '../utils/sanitize';
import { MAX_BALLOT_EDITS } from '../utils/ballotEdits';

/**
 * ReviewScreen v5 - Refactorizado con componentes modulares
 * Pantalla de revisión de votos antes de enviar.
 *
 * Es también la puerta de entrada al MODIFICAR un voto ya emitido: con
 * `isEditing` el botón guarda cambios en vez de enviar, y se avisa de que la
 * operación consume una de las modificaciones disponibles.
 *
 * @param {boolean} [props.isEditing] - se está corrigiendo un voto ya emitido
 * @param {number} [props.remainingEdits] - modificaciones que quedan
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
  isEditing = false,
  remainingEdits = MAX_BALLOT_EDITS,
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
  const { language } = useAppContext();
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
    />
  );

  return (
    <ScreenLayout
      header={headerContent}
      footer={null}
      showControlBar={false}
    >
      {/* Contenido principal */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col">
        {/* 1. Nombre visible. El tope sale de utils/sanitize, que es el mismo
            que exigen las reglas de Firestore: así el input no puede aceptar
            algo que el servidor vaya a rechazar. */}
        <div className="theme-card theme-border-primary border rounded-lg p-6 mb-6">
          <TextInput
            label={t('displayName')}
            name="reviewDisplayName"
            value={userDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={t('enterNickname')}
            maxLength={MAX_USER_TEXT_LENGTH}
            required
          />
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

        {/* Aviso de modificación: cada guardado consume una de las disponibles */}
        {isEditing && (
          <div className="p-4 mb-6 rounded-lg theme-card theme-border-primary border">
            <p className="text-sm theme-text-primary font-semibold">{t('editingNotice')}</p>
            <p className="text-sm theme-text-secondary mt-1">
              {remainingEdits === 1
                ? t('lastEditWarning')
                : t('editsRemaining')
                    .replace('{count}', remainingEdits)
                    .replace('{max}', MAX_BALLOT_EDITS)}
            </p>
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
            {isLoading
              ? (isEditing ? t('savingChanges') : t('submitting'))
              : (isEditing ? t('saveChanges') : t('submitBallot'))}
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
                  gradient={votedGame ? gameGradients[votedGame?.id] || 'bg-linear-to-br from-stone-900/70 to-slate-700/70' : 'bg-zinc-900/70'}
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
