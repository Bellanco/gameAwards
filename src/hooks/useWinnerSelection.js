/**
 * Hook custom: useWinnerSelection
 * Encapsula toda la lógica de selección y guardado de ganadores
 * Reutilizable en WinnersPanel, AdminPanel, y otros componentes
 * 
 * @param {Array} categories - Array de categorías desde Firestore
 * @returns {Object} Objeto con estado y funciones de selección
 */

import { useState, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from '../services/errorService';

/**
 * @typedef {Object} Winner
 * @property {string} name - Nombre del ganador
 * @property {string} [optionId] - ID de la opción
 */

/**
 * @typedef {Object} UseWinnerSelectionReturn
 * @property {Object.<string, Winner>} winners - Mapa de categoriaId -> winner
 * @property {Function} selectWinner - (categoryId, optionName) => void
 * @property {Function} deselectWinner - (categoryId) => void
 * @property {Function} saveWinners - () => Promise<{savedCount, skippedCount}>
 * @property {boolean} isSaving - Estado de guardado
 * @property {string|null} message - Mensaje de éxito/error
 * @property {boolean} hasChanges - Si hay cambios sin guardar
 */

export const useWinnerSelection = (categories = []) => {
  const [winners, setWinners] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Cargar ganadores existentes desde categorías
   */
  const loadExistingWinners = useCallback((categoriesData) => {
    try {
      const winnersData = {};
      categoriesData.forEach(category => {
        if (category.winner) {
          winnersData[category.id] = {
            name: category.winner,
            optionId: category.winnerOptionId
          };
        }
      });
      setWinners(winnersData);
    } catch (err) {
      logError(ERROR_TYPES.VALIDATION_ERROR, err, { 
        context: 'useWinnerSelection - loadExistingWinners' 
      });
    }
  }, []);

  /**
   * Seleccionar ganador para una categoría
   * @param {string} categoryId - ID de la categoría
   * @param {string} optionName - Nombre de la opción
   */
  const selectWinner = useCallback((categoryId, optionName) => {
    setWinners(prev => {
      const current = prev[categoryId];
      // Toggle: si ya está seleccionado, deseleccionar
      if (current?.name === optionName) {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      }
      // Si no, seleccionar
      return {
        ...prev,
        [categoryId]: { name: optionName, optionId: optionName }
      };
    });
    setHasChanges(true);
  }, []);

  /**
   * Deseleccionar ganador de una categoría
   * @param {string} categoryId - ID de la categoría
   */
  const deselectWinner = useCallback((categoryId) => {
    setWinners(prev => {
      const updated = { ...prev };
      delete updated[categoryId];
      return updated;
    });
    setHasChanges(true);
  }, []);

  /**
   * Guardar todos los ganadores en Firestore
   * @returns {Promise<{savedCount: number, skippedCount: number}>}
   */
  const saveWinners = useCallback(async () => {
    try {
      setIsSaving(true);
      let savedCount = 0;
      let skippedCount = 0;

      for (const [categoryId, winner] of Object.entries(winners)) {
        if (winner) {
          const category = categories.find(c => c.id === categoryId);
          
          // Validar que la categoría sea válida
          if (!category || !category.options || category.options.length === 0) {
            console.warn(`⚠️ Categoría ${categoryId} inválida, saltando...`);
            skippedCount++;
            continue;
          }

          try {
            const categoryRef = doc(db, 'categories', categoryId);
            await updateDoc(categoryRef, {
              winner: winner.name,
              winnerSelectedAt: new Date().toISOString()
            });
            savedCount++;
          } catch (err) {
            logError(ERROR_TYPES.FIRESTORE_ERROR, err, { 
              context: 'useWinnerSelection - saveWinners',
              categoryId
            });
            skippedCount++;
          }
        }
      }

      setHasChanges(false);
      return { savedCount, skippedCount };
    } finally {
      setIsSaving(false);
    }
  }, [winners, categories]);

  /**
   * Verificar si un ganador está seleccionado
   * @param {string} categoryId - ID de la categoría
   * @param {string} optionName - Nombre de la opción
   * @returns {boolean}
   */
  const isWinnerSelected = useCallback((categoryId, optionName) => {
    return winners[categoryId]?.name === optionName;
  }, [winners]);

  /**
   * Obtener ganador de una categoría
   * @param {string} categoryId - ID de la categoría
   * @returns {Winner|null}
   */
  const getWinner = useCallback((categoryId) => {
    return winners[categoryId] || null;
  }, [winners]);

  return {
    winners,
    selectWinner,
    deselectWinner,
    saveWinners,
    isSaving,
    message,
    setMessage,
    hasChanges,
    loadExistingWinners,
    isWinnerSelected,
    getWinner
  };
};
