/**
 * Servicio centralizado para cargar y ordenar categorías desde Firestore
 * Evita duplicación de código en App.jsx, hooks y componentes
 */

import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from './errorService';
import logger from './loggerService';

/**
 * Carga todas las categorías desde Firestore
 * @param {boolean} includeInvalid - Si incluir placeholders e inválidas
 * @param {Function} onDeleteDuplicate - Callback cuando se elimina un duplicado (opcional)
 * @returns {Promise<Array>} Array de categorías ordenadas por orderIndex (0 a mayor)
 */
export async function loadAndSortCategories(includeInvalid = false, onDeleteDuplicate = null) {
  try {
    const categoriesCollection = collection(db, 'categories');
    const snapshot = await getDocs(categoriesCollection);
    
    const allDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    }));

    logger.log(`📊 Documentos encontrados: ${allDocs.length}`);

    // Detectar y eliminar automáticamente duplicados por TÍTULO
    // Mantener solo la versión más reciente de cada título
    const titleGroups = {};
    const toDelete = [];

    allDocs.forEach(cat => {
      // Excluir solo si no tiene título válido (no contar placeholders vacíos como duplicados)
      if (!cat.title || !cat.title.trim()) return;
      
      if (!titleGroups[cat.title]) {
        titleGroups[cat.title] = [];
      }
      titleGroups[cat.title].push(cat);
    });

    // Para cada título con múltiples instancias, mantener solo la más reciente
    for (const [title, docs] of Object.entries(titleGroups)) {
      if (docs.length > 1) {
        logger.warn(`Duplicados encontrados para: "${title}"`);
        docs.sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });

        // Marcar para eliminar todos excepto el primero (más reciente)
        for (let i = 1; i < docs.length; i++) {
          toDelete.push(docs[i].id);
        }
      }
    }

    // Eliminar duplicados automáticamente
    for (const docId of toDelete) {
      try {
        logger.log(`🗑️ Eliminando duplicado automáticamente: ${docId}`);
        await deleteDoc(doc(db, 'categories', docId));
        if (onDeleteDuplicate) {
          onDeleteDuplicate(docId);
        }
      } catch (error) {
        logger.error(`Error eliminando duplicado ${docId}:`, error);
      }
    }

    // Retornar solo documentos válidos (sin duplicados)
    const filtered = allDocs.filter(cat => !toDelete.includes(cat.id));

    // Filtrar según includeInvalid
    const categoriesData = includeInvalid
      ? filtered
      : filtered.filter(cat =>
          !cat.isPlaceholder &&
          cat.title &&
          cat.title.trim() &&
          cat.options &&
          cat.options.length > 0
        );

    // Ordenar por orderIndex (de menor a mayor: 0, 1, 2, ...)
    const sortedCategories = categoriesData.sort((a, b) => {
      const indexA = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
      const indexB = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
      return indexA - indexB;
    });

    logger.log(`Categorías cargadas y ordenadas: ${sortedCategories.length}`, {
      total: allDocs.length,
      placeholders: filtered.filter(c => c.isPlaceholder).length,
      validas: categoriesData.length,
      sorted: sortedCategories
    });

    return sortedCategories;
  } catch (error) {
    logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
      context: 'categoriesService - loadAndSortCategories'
    });
    logger.error('Error cargando categorías:', error);
    return [];
  }
}

/**
 * Ordena un array de categorías por orderIndex (de menor a mayor)
 * Útil para ordenar categorías que ya están en memoria
 * @param {Array} categories - Array de categorías
 * @returns {Array} Array ordenado
 */
export function sortCategoriesByOrder(categories) {
  if (!Array.isArray(categories)) return [];
  
  return [...categories].sort((a, b) => {
    const indexA = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
    const indexB = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
    return indexA - indexB;
  });
}
