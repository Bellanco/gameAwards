import React, { useState, useEffect } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../data/literals';
import { loadAndSortCategories } from '../services/categoriesService';

/**
 * WinnersSelector - Pantalla para elegir ganadores según las categorías
 * Almacena los ganadores en el campo "winner" de cada categoría
 */
export default function WinnersSelector({ language = 'es', onClose }) {
  const [categories, setCategories] = useState([]);
  const [winners, setWinners] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const t = useTranslation(language);

  // Cargar categorías y ganadores existentes
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Cargar categorías ordenadas por orderIndex usando servicio centralizado
      const validCategories = await loadAndSortCategories(false); // false = no incluir inválidas
      
      console.log(`📊 WinnersSelector: ${validCategories.length} categorías válidas ordenadas por orderIndex`, { validCategories });
      setCategories(validCategories);

      // Cargar ganadores existentes desde el campo 'winner' de cada categoría
      const winnersData = {};
      validCategories.forEach(category => {
        if (category.winner) {
          winnersData[category.id] = {
            name: category.winner
          };
        }
      });
      setWinners(winnersData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWinner = (categoryId, optionId, optionName) => {
    setWinners(prev => {
      const current = prev[categoryId];
      // Toggle: si ya está seleccionado, deseleccionar; si no, seleccionar
      if (current?.optionId === optionId) {
        return {
          ...prev,
          [categoryId]: null
        };
      } else {
        return {
          ...prev,
          [categoryId]: { optionId, name: optionName }
        };
      }
    });
    setHasChanges(true);
  };

  const handleSaveWinners = async () => {
    try {
      setIsLoading(true);
      let savedCount = 0;
      let skippedCount = 0;

      // Guardar ganadores en el campo 'winner' de cada categoría
      for (const [categoryId, winner] of Object.entries(winners)) {
        if (winner) {
          // Verificar que la categoría sea válida
          const category = categories.find(c => c.id === categoryId);
          
          if (!category) {
            console.warn(`WinnersSelector: Categoría ${categoryId} no encontrada, saltando...`);
            skippedCount++;
            continue;
          }
          
          if (!category.options || category.options.length === 0) {
            console.warn(`WinnersSelector: Categoría ${categoryId} está vacía (placeholder), saltando...`);
            skippedCount++;
            continue;
          }

          console.log(`💾 Guardando ganador para "${category.title}": ${winner.name}`);
          const categoryRef = doc(db, 'categories', categoryId);
          await updateDoc(categoryRef, {
            winner: winner.name,
            winnerSelectedAt: new Date().toISOString()
          });
          savedCount++;
        }
      }

      const message = skippedCount > 0 
        ? `Ganadores guardados (${savedCount} guardados, ${skippedCount} vacíos ignorados)`
        : `Ganadores guardados exitosamente (${savedCount} guardados)`;
      
      setSuccessMessage(message);
      setHasChanges(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error guardando ganadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">●</div>
          <p className="text-slate-400">{t('loadingData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent border-b border-slate-800 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">{t('selectWinners')}</h1>
              <p className="text-slate-400 text-sm">{t('chooseWinnersCategory')}</p>
            </div>
            <button
              onClick={onClose}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-sm transition-all"
            >
              {t('back')}
            </button>
          </div>

          {/* Botón de guardar */}
          {hasChanges && (
            <button
              onClick={handleSaveWinners}
              disabled={isLoading}
              className="py-3 px-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all w-full md:w-auto"
            >
              {t('saveWinners')}
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        {successMessage && (
          <div className="mb-6 p-4 status-success rounded-lg">
            {successMessage}
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {categories.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400 text-lg">{t('noCategories')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => {
              // Validación defensiva
              if (!category.options || category.options.length === 0) {
                console.warn(`WinnersSelector: categoría "${category.title}" sin opciones`);
                return null;
              }
              
              return (
              <div
                key={category.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-yellow-500/30 transition-all"
              >
                <h2 className="text-xl font-bold text-white mb-4">{category.title}</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.options.map((option, idx) => {
                    const isSelected = winners[category.id]?.name === option;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectWinner(category.id, idx, option)}
                        disabled={isLoading}
                        className={`p-3 rounded-lg font-semibold text-sm transition-all border-2 ${
                          isSelected
                            ? 'bg-yellow-500 text-slate-900 border-yellow-500'
                            : 'bg-slate-700 text-slate-200 border-slate-600 hover:border-yellow-500 hover:bg-slate-600'
                        } disabled:opacity-50`}
                      >
                        {option}
                        {isSelected && ' ✓'}
                      </button>
                    );
                  })}
                </div>

                {winners[category.id] && (
                  <p className="mt-4 text-sm theme-accent">
                    {t('selectedWinner')} <span className="font-bold">{winners[category.id].name}</span>
                  </p>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
