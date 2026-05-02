/**
 * WinnersPanel - Componente unificado para selección y visualización de ganadores
 * Reemplaza: WinnersSelector.jsx + SurveyWinnersSelector.jsx
 * 
 * Modos:
 * - 'select': Seleccionar ganadores manualmente
 * - 'ranking': Ver resultados y puntuación de usuarios
 * 
 * Ventajas:
 * - Un único componente con lógica centralizada
 * - Usa hooks custom (useFirestoreCategories, useFirestoreBallots)
 * - Componentes UI reutilizables (Button, Card, Alert, Table)
 * - Todos los literales en i18n
 * - Mejor manejo de errores
 */

import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../data/literals';
import { useFirestoreCategories, useFirestoreBallots } from '../hooks';
import { Button, Card, LoadingSpinner, Alert, Table } from './ui';
import { logError, ERROR_TYPES } from '../services/errorService';
import { sortCategoriesByOrder } from '../services/categoriesService';

export default function WinnersPanel({ 
  language = 'es',
  mode = 'select', // 'select' | 'ranking'
  onClose 
}) {
  const t = useTranslation(language);
  const { categories, isLoading: categoriesLoading, refetch: refetchCategories } = useFirestoreCategories();
  const { ballots, isLoading: ballotsLoading } = useFirestoreBallots();
  
  const [winners, setWinners] = useState({});
  const [userScores, setUserScores] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Cargar ganadores existentes al montar componente
  useEffect(() => {
    if (categories.length > 0) {
      loadWinners();
    }
  }, [categories]);

  // Calcular puntuaciones si modo es 'ranking'
  useEffect(() => {
    if (mode === 'ranking' && categories.length > 0 && ballots.length > 0) {
      calculateScores();
    }
  }, [mode, categories, ballots]);

  /**
   * Cargar ganadores existentes desde Firestore
   */
  const loadWinners = () => {
    try {
      const winnersData = {};
      categories.forEach(category => {
        if (category.winner) {
          winnersData[category.id] = {
            name: category.winner,
            optionId: category.winnerOptionId
          };
        }
      });
      setWinners(winnersData);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'loadWinners' });
    }
  };

  /**
   * Calcular puntuación de usuarios basada en votos correctos
   */
  const calculateScores = () => {
    try {
      const scoresData = {};
      const validCatIds = new Set(categories.map(c => c.id));

      ballots.forEach(ballot => {
        const hasValidVote = ballot.selections && 
          Object.keys(ballot.selections).some(catId => validCatIds.has(catId));
        
        if (hasValidVote) {
          let userScore = 0;
          if (ballot.selections) {
            Object.entries(ballot.selections).forEach(([categoryId, voteName]) => {
              const category = categories.find(c => c.id === categoryId);
              if (category && winners[categoryId] && winners[categoryId].name === voteName) {
                userScore += category.weight || 1;
              }
            });
          }
          scoresData[ballot.userId] = userScore;
        }
      });

      setUserScores(scoresData);
    } catch (err) {
      logError(ERROR_TYPES.VALIDATION_ERROR, err, { context: 'calculateScores' });
    }
  };

  /**
   * Seleccionar/deseleccionar ganador
   */
  const handleSelectWinner = (categoryId, optionName) => {
    setWinners(prev => {
      const current = prev[categoryId];
      if (current?.name === optionName) {
        // Deseleccionar
        return {
          ...prev,
          [categoryId]: null
        };
      } else {
        // Seleccionar
        return {
          ...prev,
          [categoryId]: { name: optionName, optionId: optionName }
        };
      }
    });
    setHasChanges(true);
  };

  /**
   * Guardar ganadores en Firestore
   */
  const handleSaveWinners = async () => {
    try {
      setIsSaving(true);
      let savedCount = 0;
      let skippedCount = 0;

      for (const [categoryId, winner] of Object.entries(winners)) {
        if (winner) {
          const category = categories.find(c => c.id === categoryId);
          
          if (!category || !category.options || category.options.length === 0) {
            console.warn(`Categoría ${categoryId} inválida, saltando...`);
            skippedCount++;
            continue;
          }

          const categoryRef = doc(db, 'categories', categoryId);
          await updateDoc(categoryRef, {
            winner: winner.name,
            winnerSelectedAt: new Date().toISOString()
          });
          savedCount++;
        }
      }

      const message = skippedCount > 0 
        ? `${t('savePartialSuccess')} (${savedCount} ${t('selected')}, ${skippedCount} ${t('skippedEmpty')})`
        : `${t('saveSuccessful')} (${savedCount} ${t('selected')})`;
      
      setAlertMessage({ type: 'success', text: message });
      setHasChanges(false);
      
      await refetchCategories();
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'handleSaveWinners' });
      setAlertMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Obtener ranking de usuarios
   */
  const getRanking = () => {
    return Object.entries(userScores)
      .sort((a, b) => b[1] - a[1])
      .map(([userId, score], index) => {
        const ballot = ballots.find(b => b.userId === userId);
        return {
          rank: index + 1,
          userId,
          nickname: ballot?.userDisplayName || ballot?.userNickname || 'Anónimo',
          score
        };
      });
  };

  /**
   * Obtener votos correctos de un usuario (ordenados por orderIndex)
   */
  const getUserCorrectVotes = (userId) => {
    const ballot = ballots.find(b => b.userId === userId);
    const correctVotes = [];
    
    if (ballot?.selections) {
      // Iterar sobre categorías ordenadas por orderIndex
      const sortedCategories = sortCategoriesByOrder(categories);
      
      sortedCategories.forEach(category => {
        const voteName = ballot.selections[category.id];
        if (voteName && winners[category.id]?.name === voteName) {
          correctVotes.push({
            category: category.title,
            vote: voteName,
            points: category.weight || 1
          });
        }
      });
    }
    
    return correctVotes;
  };

  // === RENDER MODO: Seleccionar Ganadores ===
  if (mode === 'select') {
    if (categoriesLoading) {
      return <LoadingSpinner text={t('loadingData')} fullScreen />;
    }

    return (
      <div className="min-h-screen theme-gradient-primary">
        {/* Header */}
        <div className="theme-container-secondary theme-border-primary border-b sticky top-0 z-40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black theme-text-primary">
                  {t('selectWinners')}
                </h1>
                <p className="theme-text-secondary text-sm">{t('chooseWinnersPerCategory')}</p>
              </div>
              <Button variant="secondary" size="md" onClick={onClose}>
                {t('back')}
              </Button>
            </div>

            {/* Botón guardar */}
            {hasChanges && (
              <Button
                variant="success"
                size="lg"
                fullWidth
                loading={isSaving}
                onClick={handleSaveWinners}
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
                      <h2 className="text-xl font-bold theme-text-primary">{category.title}</h2>
                      {winners[category.id] && (
                        <p className="text-success text-sm mt-2">
                          ✓ {t('selected')}: {winners[category.id].name}
                        </p>
                      )}
                    </Card.Header>
                    <Card.Body>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {category.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectWinner(category.id, option)}
                            className={`
                              p-4 rounded-lg font-semibold transition-all text-center
                              ${winners[category.id]?.name === option
                                ? 'bg-yellow-600 text-white border-2 border-yellow-400'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-2 border-transparent'
                              }
                            `}
                          >
                            {winners[category.id]?.name === option && '✓ '}{option}
                          </button>
                        ))}
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

  // === RENDER MODO: Ver Ranking ===
  if (mode === 'ranking') {
    if (categoriesLoading || ballotsLoading) {
      return <LoadingSpinner text={t('loadingData')} />;
    }

    const ranking = getRanking();

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold theme-text-primary mb-2">{t('finalResults')}</h2>
          <p className="theme-text-secondary">{t('winnersByCategoryAndScores')}</p>
        </div>

        {alertMessage && (
          <Alert
            type={alertMessage.type}
            autoClose={3000}
            onClose={() => setAlertMessage(null)}
          >
            {alertMessage.text}
          </Alert>
        )}

        {/* Tabla de Clasificación */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-bold theme-text-primary">{t('ranking')}</h3>
          </Card.Header>
          <Card.Body>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b theme-border-primary">
                    <th className="text-left py-3 px-4 font-bold theme-text-secondary">{t('position')}</th>
                    <th className="text-left py-3 px-4 font-bold theme-text-secondary">{t('userName')}</th>
                    <th className="text-right py-3 px-4 font-bold theme-text-secondary">{t('points')}</th>
                    <th className="text-center py-3 px-4 font-bold theme-text-secondary">{t('details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map(entry => (
                    <tr key={entry.userId} className="border-b theme-border-primary hover:theme-bg-overlay-light">
                      <td className="py-3 px-4 font-bold theme-text-primary">
                        {entry.rank === 1 && '🥇'} 
                        {entry.rank === 2 && '🥈'} 
                        {entry.rank === 3 && '🥉'} 
                        {entry.rank}
                      </td>
                      <td className="py-3 px-4 theme-text-secondary">{entry.nickname}</td>
                      <td className="py-3 px-4 text-right font-bold theme-accent">{entry.score} {t('pts')}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant={selectedUserId === entry.userId ? "success" : "secondary"}
                          size="sm"
                          onClick={() => setSelectedUserId(selectedUserId === entry.userId ? null : entry.userId)}
                        >
                          <span style={{ display: 'inline-block', transition: 'transform 0.2s ease', transform: selectedUserId === entry.userId ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                            +
                          </span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>

        {/* Detalles del usuario seleccionado */}
        {selectedUserId && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-bold theme-text-primary">{t('correctVotes')}</h3>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                {getUserCorrectVotes(selectedUserId).length === 0 ? (
                  <p className="theme-text-secondary text-sm">{t('noVotesForCategory')}</p>
                ) : (
                  <>
                    {/* Encabezados de las columnas */}
                    <div className="grid grid-cols-3 gap-4 px-3 py-2 border-b border-slate-600 text-xs font-bold text-slate-400 uppercase">
                      <span>{t('categories')}</span>
                      <span className="text-center">{t('vote')}</span>
                      <span className="text-right">{t('points')}</span>
                    </div>
                    {/* Filas de datos */}
                    {getUserCorrectVotes(selectedUserId).map((vote, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-4 p-3 bg-slate-700/50 rounded items-center">
                        <span className="text-slate-300">{vote.category}</span>
                        <span className="text-success font-semibold text-center">{vote.vote}</span>
                        <span className="theme-accent font-bold text-right">+{vote.points} {t('pts')}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
