import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../data/literals';
import { loadAndSortCategories } from '../services/categoriesService';

/**
 * SurveyWinnersSelector v2 - Resultados Finales con Puntuación
 * Muestra ganadores por categoría y calcula puntos de usuarios
 * Guarda winners en el campo `winner` de cada categoría
 */
export default function SurveyWinnersSelector({ language = 'es', onClose }) {
  const [categories, setCategories] = useState([]);
  const [ballots, setBallots] = useState([]);
  const [winners, setWinners] = useState({});
  const [userScores, setUserScores] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [view, setView] = useState('details'); // Solo 'details' - clasificación
  const [selectedUserId, setSelectedUserId] = useState(null);
  const t = useTranslation(language);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Cargar categorías usando el servicio centralizado
      const categoriesData = await loadAndSortCategories(false); // false = no incluir inválidas
      setCategories(categoriesData);

      // Cargar votos (ballots)
      const ballotsCollection = collection(db, 'ballots');
      const ballotsSnapshot = await getDocs(ballotsCollection);
      const ballotsData = ballotsSnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));
      setBallots(ballotsData);

      // Cargar ganadores desde el campo 'winner' de cada categoría
      const winnersData = {};
      categoriesData.forEach(category => {
        if (category.winner) {
          winnersData[category.id] = category.winner;
        }
      });

      setWinners(winnersData);

      // Calcular puntos de cada usuario (solo ballots con al menos un voto válido)
      const scoresData = {};
      const validCatIds = new Set(categoriesData.map(c => c.id));
      
      ballotsData.forEach(ballot => {
        // Solo contar ballots con al menos un voto en categoría válida
        const hasValidVote = ballot.selections && Object.keys(ballot.selections).some(catId => validCatIds.has(catId));
        
        if (hasValidVote) {
          let userScore = 0;
          if (ballot.selections) {
            Object.entries(ballot.selections).forEach(([categoryId, voteName]) => {
              const category = categoriesData.find(c => c.id === categoryId);
              // Comparar el voto del usuario con el ganador oficial de la categoría
              if (category && winnersData[categoryId]) {
                if (winnersData[categoryId] === voteName) {
                  // Usuario votó correctamente, sumar puntos según ponderación
                  userScore += category.weight || 1;
                }
              }
            });
          }
          scoresData[ballot.userId] = userScore;
        }
      });

      setUserScores(scoresData);
      console.log('📊 Resultados finales:', { winnersData, scoresData });
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWinners = async () => {
    try {
      setIsLoading(true);
      // Los ganadores ya están guardados en la colección 'categories' con el campo 'winner'
      // Este función es legacy - el guardado se hace desde WinnersSelector
      setSuccessMessage(`Ganadores ya están guardados`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getUserDetails = (userId) => {
    const ballot = ballots.find(b => b.userId === userId);
    const correctVotes = [];
    
    if (ballot?.selections) {
      Object.entries(ballot.selections).forEach(([categoryId, voteName]) => {
        const category = categories.find(c => c.id === categoryId);
        if (category && winners[categoryId] === voteName) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="theme-text-tertiary">{t('loadingResults')}</p>
      </div>
    );
  }

  const ranking = getRanking();

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h2 className="text-2xl font-bold theme-text-primary mb-2">🏆 Resultados Finales</h2>
        <p className="theme-text-tertiary">Ganadores por categoría y puntuaciones de usuarios</p>
      </div>

      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {/* Selector de vista - OCULTO (solo clasificación) */}
      <div style={{ display: 'none' }}>
        {/* Vista removida */}
      </div>

      {/* Vista de Clasificación - ÚNICA VISTA */}
        <div className="space-y-4">
          {/* Tabla de Clasificación */}
          <div className="theme-container-secondary theme-border-primary border rounded-lg overflow-hidden">
            <div className="hidden md:grid md:grid-cols-4 gap-4 theme-container-tertiary p-4 font-bold theme-text-secondary border-b theme-border-primary">
              <div>{t('position')}</div>
              <div>{t('userName')}</div>
              <div className="text-right">{t('points')}</div>
              <div className="text-center">{t('details')}</div>
            </div>
            <div className="divide-y theme-border-primary">
              {ranking.map(entry => (
                <div key={entry.userId} className="p-4 space-y-3 md:space-y-0 md:grid md:grid-cols-4 md:gap-4 md:items-center hover:theme-bg-overlay-light transition-colors">
                  {/* Puesto (visible solo en mobile antes del nombre) */}
                  <div className="md:hidden flex items-center gap-2">
                    <span className="text-2xl">
                      {entry.rank === 1 && '🥇'} {entry.rank === 2 && '🥈'} {entry.rank === 3 && '🥉'}
                    </span>
                    <div>
                      <div className="text-sm theme-text-tertiary">#{entry.rank}</div>
                      <div className="font-bold theme-text-primary">{entry.nickname}</div>
                    </div>
                  </div>

                  {/* Desktop: Puesto */}
                  <div className="hidden md:block font-bold theme-text-primary">
                    {entry.rank === 1 && '🥇'} {entry.rank === 2 && '🥈'} {entry.rank === 3 && '🥉'} {entry.rank}
                  </div>

                  {/* Desktop: Nombre */}
                  <div className="hidden md:block text-sm font-semibold theme-text-primary">{entry.nickname}</div>

                  {/* Puntos */}
                  <div className="flex justify-between md:block md:text-right">
                    <span className="md:hidden theme-text-tertiary text-xs">{t('points')}:</span>
                    <span className="font-bold theme-accent">{entry.score} {t('pts')}</span>
                  </div>

                  {/* Botón Toggle Detalles/Cerrar */}
                  <div className="flex gap-2 md:flex md:justify-center">
                    <button
                      onClick={() => {
                        setSelectedUserId(selectedUserId === entry.userId ? null : entry.userId);
                      }}
                      className={`flex-1 md:flex-none text-sm px-3 py-2 border rounded transition-colors font-semibold ${
                        selectedUserId === entry.userId
                          ? 'theme-accent-bg text-white border-amber-600 hover:border-amber-500'
                          : 'theme-container-secondary theme-border-primary theme-text-primary hover:theme-container-tertiary'
                      }`}
                    >
                      {selectedUserId === entry.userId ? 'Cerrar' : 'Detalle'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detalles del Usuario Seleccionado */}
          {selectedUserId && (
            <div className="theme-container-secondary theme-border-primary border rounded-lg p-4">
              <div className="mb-4">
                <h3 className="font-bold theme-text-primary">
                  {t('correctVotes')}: {ballots.find(b => b.userId === selectedUserId)?.userDisplayName || ballots.find(b => b.userId === selectedUserId)?.userNickname || 'Anónimo'}
                </h3>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getUserDetails(selectedUserId).length > 0 ? (
                  <>
                    {/* Encabezados - visible solo en desktop */}
                    <div className="hidden md:grid md:grid-cols-3 gap-4 px-3 py-2 border-b theme-border-primary text-xs font-bold theme-text-secondary uppercase sticky top-0 theme-container-tertiary rounded">
                      <span>{t('categoryTitle')}</span>
                      <span className="text-center">{t('vote')}</span>
                      <span className="text-right">{t('points')}</span>
                    </div>
                    {/* Filas de datos */}
                    {getUserDetails(selectedUserId).map((detail, idx) => (
                      <div key={idx} className="md:grid md:grid-cols-3 md:gap-4 p-3 bg-green-500/10 border border-green-500/30 rounded space-y-2 md:space-y-0 md:items-center">
                        <div>
                          <div className="md:hidden text-xs theme-text-tertiary font-bold">{t('categoryTitle')}</div>
                          <span className="text-green-400 font-semibold">{detail.category}</span>
                        </div>
                        <div className="md:text-center">
                          <div className="md:hidden text-xs theme-text-tertiary font-bold">{t('vote')}</div>
                          <span className="theme-text-secondary">✓ {detail.vote}</span>
                        </div>
                        <div className="md:text-right">
                          <div className="md:hidden text-xs theme-text-tertiary font-bold">{t('points')}</div>
                          <span className="text-green-400 font-bold">+{detail.points} {t('pts')}</span>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="theme-text-tertiary text-sm p-4 text-center">
                    {language === 'es' ? 'No acertó ninguna votación' : 'No correct votes'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
