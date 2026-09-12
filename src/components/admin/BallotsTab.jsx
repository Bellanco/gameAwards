import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';

/**
 * Pestaña de votos: una fila por papeleta, con el detalle desplegable.
 *
 * @param {Array} validBallots - Votos que cuentan (ya filtrados)
 * @param {Function} getSortedBallotSelections - (ballot) => [[categoryId, optionId], ...]
 * @param {Function} getCategoryTitle - (categoryId) => título localizado
 * @param {Function} optionDisplay - (categoryId, optionId) => etiqueta localizada
 */
export default function BallotsTab({
  validBallots,
  getSortedBallotSelections,
  getCategoryTitle,
  optionDisplay,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  return (
        <div>
          <h2 className="text-2xl font-black theme-text-primary mb-6">{t('allBallots')}</h2>
          <div className="theme-card theme-border-primary border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="theme-header theme-border-primary border-b">
                <tr>
                  <th className="text-left p-4 theme-text-primary">{t('email')}</th>
                  <th className="text-left p-4 theme-text-primary">{t('nickname')}</th>
                  <th className="text-left p-4 theme-text-primary">{t('submitted')}</th>
                  <th className="text-left p-4 theme-text-primary">{t('votes')}</th>
                </tr>
              </thead>
              <tbody>
                {validBallots.map(ballot => (
                  <tr key={ballot.userId} className="theme-border-primary border-b hover:theme-bg-overlay-light transition-colors">
                    <td className="p-4 theme-text-secondary">{ballot.userEmail || '-'}</td>
                    <td className="p-4 font-semibold theme-text-primary">{ballot.userDisplayName || ballot.userNickname || '-'}</td>
                    <td className="p-4 text-sm theme-text-secondary">
                      {ballot.submittedAt ? new Date(ballot.submittedAt).toLocaleString() : '-'}
                    </td>
                    <td className="p-4">
                      <details className="cursor-pointer">
                        <summary className="theme-accent font-semibold hover:theme-accent/80">
                          {t('view')} ({Object.keys(ballot.selections || {}).length})
                        </summary>
                        <div className="mt-2 p-2 theme-container-secondary rounded-sm text-sm font-mono theme-text-secondary">
                          {getSortedBallotSelections(ballot).map(([cat, val]) => (
                            <div key={cat}><span className="text-info">{getCategoryTitle(cat)}:</span> {optionDisplay(cat, val)}</div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  );
}
