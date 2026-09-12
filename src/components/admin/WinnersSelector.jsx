import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { Button, Card, LoadingSpinner, Alert } from '../ui';
import { tField, getCategoryTitle, getOptionId, getOptionLabel } from '../../utils/localize';

/**
 * Selector de ganadores: una tarjeta por categoría con sus nominados.
 * El ganador se guarda por optionId, nunca por nombre.
 */
export default function WinnersSelector({
  categories,
  categoriesLoading,
  winners,
  hasChanges,
  isSaving,
  alertMessage,
  setAlertMessage,
  onSelectWinner,
  onClearWinners,
  onSaveWinners,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  if (categoriesLoading) {
    return <LoadingSpinner text={t('loadingData')} fullScreen />;
  }

  return (
    <div className="min-h-screen theme-gradient-primary">
      {/* Header */}
      <div className="theme-container-secondary theme-border-primary border-b sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black theme-text-primary">
                {t('selectWinners')}
              </h1>
              <p className="theme-text-secondary text-sm">{t('chooseWinnersPerCategory')}</p>
            </div>
            <Button variant="danger" size="md" onClick={onClearWinners}>
              {t('clearWinners')}
            </Button>
          </div>

          {/* Botón guardar */}
          {hasChanges && (
            <Button
              variant="success"
              size="lg"
              fullWidth
              loading={isSaving}
              onClick={onSaveWinners}
              className="md:w-auto"
            >
              {t('saveWinners')}
            </Button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            autoClose={3000}
            onClose={() => setAlertMessage(null)}
          >
            {alertMessage.text}
          </Alert>
        )}
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {categories.length === 0 ? (
          <Card>
            <Card.Body className="text-center">
              <p className="theme-text-secondary text-lg">{t('noCategories')}</p>
            </Card.Body>
          </Card>
        ) : (
          <div className="space-y-6">
            {categories.map(category => {
              if (!category.options || category.options.length === 0) {
                return null;
              }

              return (
                <Card key={category.id}>
                  <Card.Header>
                    <h2 className="text-xl font-bold theme-text-primary">{getCategoryTitle(category, language)}</h2>
                    {winners[category.id] && (
                      <p className="text-success text-sm mt-2">
                        ✓ {t('selected')}: {getOptionLabel(category, winners[category.id], language)}
                      </p>
                    )}
                  </Card.Header>
                  <Card.Body>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.options.map((option, idx) => {
                        const optionId = getOptionId(option, category.id, idx);
                        const optionName = tField(option, language);
                        const isWinner = winners[category.id] === optionId;
                        return (
                          <button
                            key={optionId}
                            onClick={() => onSelectWinner(category.id, optionId)}
                            className={`
                              p-4 rounded-lg font-semibold transition-all text-center
                              ${isWinner
                                ? 'theme-accent-bg theme-text-inverse border-2 theme-accent-border'
                                : 'theme-btn-secondary border-2 border-transparent'
                              }
                            `}
                          >
                            {isWinner && '✓ '}{optionName}
                          </button>
                        );
                      })}
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
