/**
 * Hook custom: useFirestoreCategories
 * Maneja carga, filtrado y validación de categorías desde Firestore
 * Utiliza el servicio centralizado categoriesService para ordenamiento
 * 
 * @typedef {Object} Category
 * @property {string} id - ID de la categoría
 * @property {string} docId - ID del documento en Firestore
 * @property {string} title - Título de la categoría
 * @property {string[]} options - Array de opciones
 * @property {number} [weight] - Ponderación (default: 1)
 * @property {boolean} [isPlaceholder] - Si es placeholder
 * @property {string} [createdAt] - ISO timestamp de creación
 * @property {string} [updatedAt] - ISO timestamp de actualización
 * 
 * @typedef {Object} UseFirestoreCategoriesReturn
 * @property {Category[]} categories - Array de categorías
 * @property {boolean} isLoading - Estado de carga
 * @property {Error|null} error - Error si existe
 * @property {Function} refetch - Función para recargar datos
 * 
 * @param {boolean} [includeInvalid=false] - Si incluir placeholders e inválidas
 * @returns {UseFirestoreCategoriesReturn} Estado y funciones
 */

import { useState, useEffect, useCallback } from 'react';
import { loadAndSortCategories } from '../services/categoriesService';
import { logError, ERROR_TYPES } from '../services/errorService';

export const useFirestoreCategories = (includeInvalid = false) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedCategories = await loadAndSortCategories(includeInvalid);
      setCategories(loadedCategories);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, {
        context: 'useFirestoreCategories - loadCategories'
      });
    } finally {
      setIsLoading(false);
    }
  }, [includeInvalid]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return { categories, isLoading, error, refetch: loadCategories };
};
