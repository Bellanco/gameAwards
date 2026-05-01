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
      setSuccessMessage(`✅ Ganadores ya están guardados`);
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
        <p className="text-slate-400">Cargando resultados...</p>
      </div>
    );
  }

  const ranking = getRanking();

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">🏆 Resultados Finales</h2>
        <p className="text-slate-400">Ganadores por categoría y puntuaciones de usuarios</p>
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
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 gap-4 bg-slate-900/50 p-4 font-bold text-slate-300 border-b border-slate-700">
              <div>Puesto</div>
              <div>Usuario</div>
              <div className="text-right">Puntos</div>
              <div className="text-center">Detalles</div>
            </div>
            <div className="divide-y divide-slate-700">
              {ranking.map(entry => (
                <div key={entry.userId} className="grid grid-cols-4 gap-4 p-4 items-center hover:bg-slate-800/50 transition-colors">
                  <div className="font-bold text-white">
                    {entry.rank === 1 && '🥇'} {entry.rank === 2 && '🥈'} {entry.rank === 3 && '🥉'} {entry.rank}
                  </div>
                  <div className="text-slate-300 text-sm font-semibold">{entry.nickname}</div>
                  <div className="text-right font-bold text-yellow-400">{entry.score} pts</div>
                  <button
                    onClick={() => setSelectedUserId(entry.userId)}
                    className="text-center text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition-colors"
                  >
                    Ver
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Detalles del Usuario Seleccionado */}
          {selectedUserId && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white">
                  Votos correctos de: {ballots.find(b => b.userId === selectedUserId)?.userNickname || 'Anónimo'}
                </h3>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="text-slate-400 hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getUserDetails(selectedUserId).length > 0 ? (
                  <>
                    {/* Encabezados */}
                    <div className="grid grid-cols-3 gap-4 px-3 py-2 border-b border-slate-600 text-xs font-bold text-slate-400 uppercase sticky top-0 bg-slate-800">
                      <span>Categoría</span>
                      <span className="text-center">Voto</span>
                      <span className="text-right">Puntos</span>
                    </div>
                    {/* Filas de datos */}
                    {getUserDetails(selectedUserId).map((detail, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-4 p-3 bg-green-500/10 border border-green-500/30 rounded items-center">
                        <span className="text-green-400 font-semibold">{detail.category}</span>
                        <span className="text-slate-300 text-center">✓ {detail.vote}</span>
                        <span className="text-green-400 font-bold text-right">+{detail.points} pts</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">No acertó ninguna votación</p>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
