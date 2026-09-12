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
 * - Componentes UI reutilizables (Button, Card, Alert)
 * - Todos los literales en i18n
 * - Mejor manejo de errores
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useFirestoreCategories, useFirestoreBallots } from '../hooks';
import { logError, ERROR_TYPES } from '../services/errorService';
import { sortCategoriesByOrder } from '../services/categoriesService';
import { saveWinners } from '../services/winnersService';
import { getCategoryTitle, getOptionLabel, resolveOptionId } from '../utils/localize';
import WinnersSelector from './admin/WinnersSelector';
import RankingTable from './admin/RankingTable';
import { computeLeaderboard } from '../utils/scoring';
import logger from '../services/loggerService';

export default function WinnersPanel({ mode = 'select' }) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const { categories, isLoading: categoriesLoading, refetch: refetchCategories } = useFirestoreCategories();
  const { ballots, isLoading: ballotsLoading } = useFirestoreBallots();
  
  const [winners, setWinners] = useState({});
  const [userScores, setUserScores] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  /**
   * Cargar ganadores existentes desde Firestore.
   * `category.winner` es el optionId ganador (o null).
   */
  const loadWinners = useCallback(() => {
    try {
      const winnersData = {};
      categories.forEach(category => {
        if (category.winner) {
          // Normaliza por si el dato antiguo guardó el ganador por nombre.
          winnersData[category.id] = resolveOptionId(category, category.winner);
        }
      });
      setWinners(winnersData);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'loadWinners' });
    }
  }, [categories]);

  /**
   * Calcular puntuación de usuarios (acierto = optionId votado == optionId ganador).
   * Usa los ganadores en edición (state `winners`), no los persistidos.
   */
  const calculateScores = useCallback(() => {
    try {
      // Proyectar el winner en edición sobre las categorías para el cálculo.
      const categoriesWithWinners = categories.map(c => ({ ...c, winner: winners[c.id] || null }));
      const scoresData = {};
      computeLeaderboard(ballots, categoriesWithWinners).forEach(entry => {
        scoresData[entry.userId] = entry.points;
      });
      setUserScores(scoresData);
    } catch (err) {
      logError(ERROR_TYPES.VALIDATION_ERROR, err, { context: 'calculateScores' });
    }
  }, [categories, ballots, winners]);

  // Cargar ganadores existentes al montar componente / cuando cambian las categorías
  useEffect(() => {
    if (categories.length > 0) {
      loadWinners();
    }
  }, [categories.length, loadWinners]);

  // Calcular puntuaciones si modo es 'ranking'
  useEffect(() => {
    if (mode === 'ranking' && categories.length > 0 && ballots.length > 0 && Object.keys(winners).length > 0) {
      calculateScores();
    }
  }, [mode, categories.length, ballots.length, winners, calculateScores]);

  /**
   * Limpiar todas las selecciones de ganadores
   */
  const handleClearWinners = () => {
    if (window.confirm(t('clearWinnersConfirm'))) {
      setWinners({});
      setHasChanges(true);
    }
  };

  /**
   * Seleccionar/deseleccionar ganador (por optionId).
   */
  const handleSelectWinner = (categoryId, optionId) => {
    setWinners(prev => {
      if (prev[categoryId] === optionId) {
        return { ...prev, [categoryId]: null }; // toggle off
      }
      return { ...prev, [categoryId]: optionId };
    });
    setHasChanges(true);
  };

  /**
   * Guardar ganadores en Firestore
   * Guarda todas las categorías, incluyendo las limpias (null)
   */
  const handleSaveWinners = async () => {
    try {
      setIsSaving(true);

      // Un único lote atómico para todas las categorías (antes: un updateDoc
      // por categoría en un bucle, que dejaba ganadores a medias si fallaba).
      const { saved, skipped } = await saveWinners(categories, winners);
      if (skipped > 0) logger.warn(`${skipped} categoría(s) sin nominados, omitidas.`);

      const message = `${t('saveSuccessful')} (${saved} ${t('selected')})`;
      
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
          nickname: ballot?.userDisplayName || ballot?.userNickname || t('anonymous'),
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
        const votedOptionId = ballot.selections[category.id];
        if (votedOptionId && winners[category.id] === votedOptionId) {
          correctVotes.push({
            category: getCategoryTitle(category, language),
            vote: getOptionLabel(category, votedOptionId, language),
            points: category.weight || 1
          });
        }
      });
    }
    
    return correctVotes;
  };

  // === RENDER ===
  if (mode === 'select') {
    return (
      <WinnersSelector
        categories={categories}
        categoriesLoading={categoriesLoading}
        winners={winners}
        hasChanges={hasChanges}
        isSaving={isSaving}
        alertMessage={alertMessage}
        setAlertMessage={setAlertMessage}
        onSelectWinner={handleSelectWinner}
        onClearWinners={handleClearWinners}
        onSaveWinners={handleSaveWinners}
      />
    );
  }

  if (mode === 'ranking') {
    return (
      <RankingTable
        categoriesLoading={categoriesLoading}
        ballotsLoading={ballotsLoading}
        ranking={getRanking()}
        alertMessage={alertMessage}
        setAlertMessage={setAlertMessage}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        getUserCorrectVotes={getUserCorrectVotes}
      />
    );
  }

  return null;
}
