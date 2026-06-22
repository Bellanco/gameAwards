/**
 * Servicio centralizado para cargar y ordenar categorías desde Firestore
 * Evita duplicación de código en App.jsx, hooks y componentes
 */

import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, ERROR_TYPES } from './errorService';
import logger from './loggerService';
import { tField, hasTitle } from '../utils/localize';

/**
 * Carga todas las categorías desde Firestore.
 *
 * Los duplicados (mismo título) se descartan SIEMPRE del resultado en memoria,
 * pero solo se BORRAN de Firestore si `autoCleanDuplicates` es true (acción de
 * admin). Así la ruta de lectura pública nunca escribe en la base de datos.
 *
 * @param {boolean} includeInvalid - Si incluir placeholders e inválidas
 * @param {boolean} autoCleanDuplicates - Si borrar duplicados en Firestore (admin)
 * @returns {Promise<Array>} Categorías ordenadas por orderIndex (0 a mayor)
 */
export async function loadAndSortCategories(includeInvalid = false, autoCleanDuplicates = false) {
  try {
    const categoriesCollection = collection(db, 'categories');
    const snapshot = await getDocs(categoriesCollection);

    const allDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    }));

    logger.log(`📊 Documentos encontrados: ${allDocs.length}`);

    // Detectar duplicados por TÍTULO (clave localizada), conservando la versión
    // más reciente. El título puede ser { es, en } o string (legacy).
    const titleGroups = {};
    const toDelete = [];

    allDocs.forEach(cat => {
      if (!hasTitle(cat)) return; // los placeholders vacíos no cuentan como duplicados
      const key = (tField(cat.title, 'es') || tField(cat.title, 'en')).trim().toLowerCase();
      if (!titleGroups[key]) titleGroups[key] = [];
      titleGroups[key].push(cat);
    });

    for (const [key, docs] of Object.entries(titleGroups)) {
      // Blindaje: nunca tratar una clave vacía como "duplicado" (un cambio de
      // formato podría dejar títulos sin resolver y agruparlos todos juntos).
      if (!key) continue;
      if (docs.length > 1) {
        logger.warn(`Duplicados encontrados para: "${key}"`);
        docs.sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        for (let i = 1; i < docs.length; i++) {
          toDelete.push(docs[i].id);
        }
      }
    }

    // Tope de seguridad: si el borrado afectaría a la mitad o más de la
    // colección, casi seguro es un falso positivo por datos sin migrar. En ese
    // caso NO se borra nada en Firestore; solo se descartan en memoria y se
    // avisa. Evita que un error de formato vacíe las categorías.
    const safeToDelete =
      toDelete.length > 0 && toDelete.length < Math.ceil(allDocs.length / 2)
        ? toDelete
        : [];
    if (toDelete.length > 0 && safeToDelete.length === 0) {
      logger.warn(
        `⚠️ Auto-limpieza abortada: ${toDelete.length}/${allDocs.length} categorías marcadas como duplicadas (posible dato sin migrar). No se borra nada en Firestore.`
      );
    }

    // Borrado en Firestore SOLO si lo pide un admin (evita escrituras en lecturas).
    if (autoCleanDuplicates) {
      for (const docId of safeToDelete) {
        try {
          logger.log(`🗑️ Eliminando duplicado: ${docId}`);
          await deleteDoc(doc(db, 'categories', docId));
        } catch (error) {
          logger.error(`Error eliminando duplicado ${docId}:`, error);
        }
      }
    }

    // Retornar solo documentos válidos (sin duplicados). Usa `safeToDelete`: si
    // el tope de seguridad abortó el borrado, tampoco se ocultan en memoria, así
    // la app nunca se queda sin categorías por un falso positivo de duplicados.
    const filtered = allDocs.filter(cat => !safeToDelete.includes(cat.id));

    // Filtrar según includeInvalid
    const categoriesData = includeInvalid
      ? filtered
      : filtered.filter(cat =>
          !cat.isPlaceholder &&
          hasTitle(cat) &&
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
