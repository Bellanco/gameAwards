/**
 * Hook custom: useBallotStats
 *
 * Todo lo que el panel necesita para LEER los votos: cuáles cuentan, cuántos
 * ha recibido cada nominado y cómo se llama cada cosa en el idioma activo.
 *
 * Vive fuera del AdminPanel porque es cálculo, no pantalla: el componente se
 * había comido el recuento, el filtrado y tres resolutores de etiquetas, y se
 * pasaba del límite de 300 líneas del proyecto sin que nada de eso fuera JSX.
 *
 * Las estadísticas se calculan con `useMemo`, no con estado + efecto: son una
 * función pura de (votos, categorías) y guardarlas en estado solo añadía un
 * render de más por cada carga.
 *
 * @param {Array} ballots - votos tal cual los devuelve useFirestoreBallots
 * @param {Array} categories - categorías cargadas
 * @param {string} language - idioma activo ('es' | 'en')
 * @returns {{validBallots: Array, statsData: Object|null,
 *            getCategoryTitle: Function, optionDisplay: Function,
 *            getSortedBallotSelections: Function}}
 */

import { useMemo, useCallback } from 'react';
import { sortCategoriesByOrder } from '../services/categoriesService';
import {
  getCategoryTitle as localizeCategoryTitle,
  getOptionLabel,
  hasTitle,
} from '../utils/localize';

export const useBallotStats = (ballots, categories, language) => {
  /** Categorías que cuentan: con título y sin ser un placeholder. */
  const validCategories = useMemo(
    () => categories.filter((cat) => !cat.isPlaceholder && hasTitle(cat)),
    [categories]
  );

  /**
   * Votos que cuentan: los que tienen al menos una selección en una categoría
   * válida. Memoizado porque antes se recalculaba (con su Set) tres veces por
   * render.
   */
  const validBallots = useMemo(() => {
    const validCatIds = new Set(validCategories.map((c) => c.id));
    return ballots.filter(
      (ballot) =>
        ballot.selections &&
        Object.keys(ballot.selections).some((catId) => validCatIds.has(catId))
    );
  }, [validCategories, ballots]);

  /**
   * Votos por nominado y categoría: `{ categoryId: { optionId: nº } }`.
   * Mantiene el orden de las categorías (por orderIndex), que es el que espera
   * la pestaña Resumen.
   */
  const statsData = useMemo(() => {
    if (validCategories.length === 0 || ballots.length === 0) return null;

    const validCatIds = new Set(validCategories.map((c) => c.id));
    const voteCounts = {};
    ballots.forEach((ballot) => {
      if (!ballot.selections) return;
      Object.entries(ballot.selections).forEach(([category, value]) => {
        if (!validCatIds.has(category)) return;
        if (!voteCounts[category]) voteCounts[category] = {};
        voteCounts[category][value] = (voteCounts[category][value] || 0) + 1;
      });
    });

    const stats = {};
    validCategories.forEach((cat) => {
      if (voteCounts[cat.id]) stats[cat.id] = voteCounts[cat.id];
    });
    return stats;
  }, [validCategories, ballots]);

  /** Título de una categoría por su id, en el idioma activo. */
  const getCategoryTitle = useCallback(
    (categoryId) => {
      const cat = categories.find((c) => c.id === categoryId);
      return cat ? localizeCategoryTitle(cat, language) : categoryId;
    },
    [categories, language]
  );

  /** Etiqueta localizada de una opción (optionId) dentro de una categoría. */
  const optionDisplay = useCallback(
    (categoryId, optionId) => {
      const cat = categories.find((c) => c.id === categoryId);
      return cat ? getOptionLabel(cat, optionId, language) : optionId;
    },
    [categories, language]
  );

  /**
   * Selecciones de un voto, ordenadas por el orderIndex de las categorías (el
   * mismo orden en el que se votó).
   */
  const getSortedBallotSelections = useCallback(
    (ballot) => {
      if (!ballot.selections) return [];
      return sortCategoriesByOrder(categories)
        .filter((cat) => ballot.selections[cat.id])
        .map((cat) => [cat.id, ballot.selections[cat.id]]);
    },
    [categories]
  );

  return {
    validBallots,
    statsData,
    getCategoryTitle,
    optionDisplay,
    getSortedBallotSelections,
  };
};
