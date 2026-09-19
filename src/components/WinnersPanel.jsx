/**
 * WinnersPanel - Selección de los ganadores de la edición en curso, y el sitio
 * donde la edición termina.
 *
 * AQUÍ SE PUBLICA. Marcar el último ganador y publicar son el mismo gesto: en
 * cuanto se guardan todos los ganadores de una edición ya cerrada, sale el
 * diálogo de publicación (`admin/PublishDialog`) y desde ahí se archiva. Antes
 * había que ir a la pestaña Temporada a pulsar otro botón, con la clasificación
 * en una pantalla y la acción en otra.
 *
 * Tenía un segundo modo, 'ranking', que pintaba la clasificación en vivo con el
 * desglose de aciertos por participante. Se retiró con la pestaña que lo
 * mostraba: la clasificación se ve al publicar (en el diálogo) y después en el
 * Histórico, que es lo que ve también el público.
 *
 * Los ganadores se guardan en `admin/winners` (no en `categories`, que es de
 * lectura pública): ver services/winnersService.js.
 *
 * @param {Object} props
 * @param {Object} props.season - controles del ciclo (`useSeasonControls`)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useFirestoreCategories } from '../hooks';
import { logError, ERROR_TYPES } from '../services/errorService';
import { saveWinners, fetchWinners } from '../services/winnersService';
import { resolveOptionId } from '../utils/localize';
import { SEASON_STAGE } from '../utils/votingSchedule';
import WinnersSelector from './admin/WinnersSelector';
import PublishDialog from './admin/PublishDialog';
import logger from '../services/loggerService';

export default function WinnersPanel({ season }) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const { categories, isLoading: categoriesLoading, refetch: refetchCategories } = useFirestoreCategories();
  const [showPublish, setShowPublish] = useState(false);

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
   * Cuántas categorías pueden tener ganador y cuántas ya lo tienen.
   *
   * Solo cuentan las que tienen nominados: una categoría vacía no se puede
   * ganar, así que exigirle un ganador dejaría la edición imposible de
   * completar (y de publicar).
   */
  const { votableCount, winnersCount } = useMemo(() => {
    const votables = categories.filter((category) => category.options?.length > 0);
    return {
      votableCount: votables.length,
      winnersCount: votables.filter((category) => winners[category.id]).length,
    };
  }, [categories, winners]);

  /** La edición está cerrada y con todos sus ganadores puestos y guardados. */
  const stage = season?.stage;
  const readyToPublish =
    stage === SEASON_STAGE.PENDING && votableCount > 0 && winnersCount === votableCount;

  /**
   * Guardar ganadores en Firestore
   * Guarda todas las categorías, incluyendo las limpias (null)
   */
  const handleSaveWinners = async () => {
    try {
      setIsSaving(true);

      // Una única escritura en `admin/winners` (antes: un updateDoc por
      // categoría en un bucle, que dejaba ganadores a medias si fallaba).
      // Guardar ganadores NO publica nada por sí solo: mientras la edición está
      // viva no existe ningún snapshot público que se pueda filtrar antes de
      // tiempo. Lo que hace este guardado es OFRECER la publicación cuando ya no
      // queda nada por decidir (ver más abajo).
      const { saved, skipped, migrated } = await saveWinners(categories, winners);
      if (skipped > 0) logger.warn(`${skipped} categoría(s) sin nominados, omitidas.`);
      if (migrated > 0) logger.log(`${migrated} categoría(s) migradas al nuevo modelo de ganadores.`);

      const message = `${t('saveSuccessful')} (${saved} ${t('selected')})`;

      setAlertMessage({ type: 'success', text: message });
      setHasChanges(false);

      await refetchCategories();
      setTimeout(() => setAlertMessage(null), 3000);

      // Última pieza colocada en una edición ya cerrada: no hay nada más que
      // hacer con ella que publicarla, así que se ofrece aquí mismo.
      if (readyToPublish) setShowPublish(true);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'handleSaveWinners' });
      setAlertMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Publica la edición desde el diálogo.
   *
   * Al terminar, la edición ya no existe: las categorías se quedan sin nominados
   * y el ciclo vuelve al principio, así que hay que releerlas y soltar las
   * selecciones (si no, el selector seguiría pintando los ganadores de una
   * edición que ya está en el histórico).
   */
  const handlePublish = async () => {
    await season.publishSeason();
    setShowPublish(false);
    setWinners({});
    setHasChanges(false);
    await refetchCategories();
  };

  // Un cambio de etapa (se abrió una edición, se cerró la votación, se publicó)
  // significa que los nominados de esta pantalla ya no valen: al abrir se
  // estrenan y al publicar se vacían. Sin esto, entrar aquí desde una pestaña
  // que lleva rato abierta enseñaba las categorías de la edición anterior.
  useEffect(() => {
    refetchCategories();
  }, [stage, refetchCategories]);

  // El resultado de publicar lo cuenta el hook del ciclo; aquí se enseña en la
  // misma alerta que el resto de la pantalla, que es donde el admin está
  // mirando.
  useEffect(() => {
    if (season?.message) setAlertMessage({ type: 'success', text: season.message });
    else if (season?.error) setAlertMessage({ type: 'error', text: season.error });
  }, [season?.message, season?.error]);

  return (
    <>
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
        isSeasonClosed={stage === SEASON_STAGE.PENDING}
        winnersCount={winnersCount}
        votableCount={votableCount}
        // El botón de publicar solo aparece cuando ya no quedan cambios sin
        // guardar: es la salida para quien cerró el diálogo con «Ahora no», y
        // sin él esa decisión dejaría la edición sin forma de publicarse.
        canPublish={readyToPublish && !hasChanges}
        onPublish={() => setShowPublish(true)}
      />

      {showPublish && (
        <PublishDialog
          stage={stage}
          seasonLabel={season?.seasonLabel || ''}
          busy={season?.busy}
          onConfirm={handlePublish}
          onClose={() => setShowPublish(false)}
        />
      )}
    </>
  );
}
