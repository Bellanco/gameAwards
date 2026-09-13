/**
 * WinnersPanel - Selección de los ganadores de la edición en curso.
 *
 * Tenía un segundo modo, 'ranking', que pintaba la clasificación en vivo con el
 * desglose de aciertos por participante. Se retiró con la pestaña que lo
 * mostraba: la clasificación se ve ahora donde de verdad hace falta —en la
 * pestaña Temporada, como vista previa de lo que se va a publicar— y después en
 * el Histórico, que es lo que ve también el público.
 *
 * Los ganadores se guardan en `admin/winners` (no en `categories`, que es de
 * lectura pública): ver services/winnersService.js.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useFirestoreCategories } from '../hooks';
import { logError, ERROR_TYPES } from '../services/errorService';
import { saveWinners, fetchWinners } from '../services/winnersService';
import { resolveOptionId } from '../utils/localize';
import WinnersSelector from './admin/WinnersSelector';
import logger from '../services/loggerService';

export default function WinnersPanel() {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const { categories, isLoading: categoriesLoading, refetch: refetchCategories } = useFirestoreCategories();

  const [winners, setWinners] = useState({});
  // Los ganadores guardados llegan de Firestore, así que hay una ventana entre
  // el primer render y su respuesta. El selector NO puede mostrarse durante esa
  // ventana: un clic en ese hueco lo pisaría la carga al resolver, y el admin
  // vería su selección desaparecer (o, peor, guardaría sin ella).
  const [winnersLoading, setWinnersLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  /**
   * Cargar ganadores existentes desde `admin/winners` (documento de admin).
   *
   * Ya no salen de `categories`: esa colección es de lectura pública y el
   * ganador guardado ahí se podía consultar antes de anunciarlo. El servicio
   * sigue aceptando el formato antiguo como respaldo y el primer guardado lo
   * migra (ver winnersService).
   */
  const loadWinners = useCallback(async () => {
    try {
      const stored = await fetchWinners(categories);
      // Normaliza por si el dato antiguo guardó el ganador por nombre.
      const winnersData = {};
      categories.forEach(category => {
        const optionId = stored[category.id];
        if (optionId) winnersData[category.id] = resolveOptionId(category, optionId);
      });
      setWinners(winnersData);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'loadWinners' });
    } finally {
      setWinnersLoading(false);
    }
  }, [categories]);

  // Cargar ganadores existentes al montar componente / cuando cambian las categorías
  useEffect(() => {
    if (categories.length === 0) {
      // Sin categorías no hay nada que leer, pero hay que salir de «cargando» o
      // el selector se quedaría con el spinner para siempre.
      setWinnersLoading(false);
      return;
    }
    loadWinners();
  }, [categories.length, loadWinners]);

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

      // Una única escritura en `admin/winners` (antes: un updateDoc por
      // categoría en un bucle, que dejaba ganadores a medias si fallaba).
      // Guardar ganadores ya NO publica nada. Mientras la edición está viva no
      // existe ningún snapshot público, así que no hay nada que se pueda filtrar
      // antes de tiempo: publicar es el gesto de cerrar la edición desde la
      // pestaña Temporada.
      const { saved, skipped, migrated } = await saveWinners(categories, winners);
      if (skipped > 0) logger.warn(`${skipped} categoría(s) sin nominados, omitidas.`);
      if (migrated > 0) logger.log(`${migrated} categoría(s) migradas al nuevo modelo de ganadores.`);

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

  return (
    <WinnersSelector
      categories={categories}
      categoriesLoading={categoriesLoading || winnersLoading}
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
