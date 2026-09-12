import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { Button, Card, LoadingSpinner, Alert } from '../ui';

/**
 * Clasificación final: puntos por usuario y detalle de sus aciertos.
 */
export default function RankingTable({
  categoriesLoading,
  ballotsLoading,
  ranking,
  alertMessage,
  setAlertMessage,
  selectedUserId,
  setSelectedUserId,
  getUserCorrectVotes,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  if (categoriesLoading || ballotsLoading) {
    return <LoadingSpinner text={t('loadingData')} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold theme-text-primary mb-2">{t('finalResults')}</h2>
        <p className="theme-text-secondary">{t('winnersByCategoryAndScores')}</p>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          autoClose={3000}
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.text}
        </Alert>
      )}

      {/* Tabla de Clasificación */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-bold theme-text-primary">{t('ranking')}</h3>
        </Card.Header>
        <Card.Body>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b theme-border-primary">
                  <th className="text-left py-3 px-4 font-bold theme-text-secondary">{t('position')}</th>
                  <th className="text-left py-3 px-4 font-bold theme-text-secondary">{t('userName')}</th>
                  <th className="text-right py-3 px-4 font-bold theme-text-secondary">{t('points')}</th>
                  <th className="text-center py-3 px-4 font-bold theme-text-secondary">{t('details')}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map(entry => (
                  <tr key={entry.userId} className="border-b theme-border-primary hover:theme-bg-overlay-light">
                    <td className="py-3 px-4 font-bold theme-text-primary">
                      {entry.rank === 1 && '🥇'} 
                      {entry.rank === 2 && '🥈'} 
                      {entry.rank === 3 && '🥉'} 
                      {entry.rank}
                    </td>
                    <td className="py-3 px-4 theme-text-secondary">{entry.nickname}</td>
                    <td className="py-3 px-4 text-right font-bold theme-accent">{entry.score} {t('pts')}</td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant={selectedUserId === entry.userId ? "success" : "secondary"}
                        size="sm"
                        onClick={() => setSelectedUserId(selectedUserId === entry.userId ? null : entry.userId)}
                      >
                        <span style={{ display: 'inline-block', transition: 'transform 0.2s ease', transform: selectedUserId === entry.userId ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                          +
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>

      {/* Detalles del usuario seleccionado */}
      {selectedUserId && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-bold theme-text-primary">{t('correctVotes')}</h3>
          </Card.Header>
          <Card.Body>
            <div className="space-y-2">
              {getUserCorrectVotes(selectedUserId).length === 0 ? (
                <p className="theme-text-secondary text-sm">{t('noVotesForCategory')}</p>
              ) : (
                <>
                  {/* Encabezados de las columnas */}
                  <div className="grid grid-cols-3 gap-4 px-3 py-2 border-b theme-border-primary text-sm font-bold theme-text-secondary uppercase">
                    <span>{t('categories')}</span>
                    <span className="text-center">{t('vote')}</span>
                    <span className="text-right">{t('points')}</span>
                  </div>
                  {/* Filas de datos */}
                  {getUserCorrectVotes(selectedUserId).map((vote, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 p-3 theme-card rounded-sm items-center">
                      <span className="theme-text-secondary">{vote.category}</span>
                      <span className="text-success font-semibold text-center">{vote.vote}</span>
                      <span className="theme-accent font-bold text-right">+{vote.points} {t('pts')}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
