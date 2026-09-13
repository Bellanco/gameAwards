import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { MedalIcon } from '../Icons';

/**
 * Pestaña de resumen: totales y top 3 por categoría.
 *
 * @param {Array} validBallots - Votos que cuentan (ya filtrados)
 * @param {Object|null} statsData - { categoryId: { optionId: nºVotos } }
 * @param {Function} getCategoryTitle - (categoryId) => título localizado
 * @param {Function} optionDisplay - (categoryId, optionId) => etiqueta localizada
 */
export default function OverviewTab({ validBallots, statsData, getCategoryTitle, optionDisplay }) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  return (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="theme-card theme-border-primary border rounded-lg p-6">
              <p className="text-sm theme-text-secondary uppercase mb-2">{t('totalBallots')}</p>
              <p className="text-4xl font-black theme-accent">{validBallots.length}</p>
            </div>
            <div className="theme-card theme-border-primary border rounded-lg p-6">
              <p className="text-sm theme-text-secondary uppercase mb-2">{t('categories')}</p>
              <p className="text-4xl font-black theme-accent">{statsData ? Object.keys(statsData).length : 0}</p>
            </div>
            <div className="theme-card theme-border-primary border rounded-lg p-6">
              <p className="text-sm theme-text-secondary uppercase mb-2">{t('participation')}</p>
              <p className="text-4xl font-black theme-accent">100%</p>
            </div>
          </div>

          {/* Results by Category */}
          {statsData && (
            <div>
              <h2 className="text-2xl font-black theme-text-primary mb-6">{t('resultsByCategory')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(statsData).map(([category, votes]) => {
                  return (
                    <div key={category} className="theme-card theme-border-primary border rounded-lg p-6">
                      <h3 className="text-lg font-bold theme-accent mb-4">{getCategoryTitle(category)}</h3>
                      <div className="space-y-2">
                        {Object.entries(votes).sort(([, a], [, b]) => b - a).slice(0, 3).map(([option, count], idx) => (
                          <div key={option} className="flex justify-between items-center">
                            <span className={`text-sm flex items-center gap-2 ${idx === 0 ? 'theme-accent font-bold' : 'theme-text-secondary'}`}>
                              {idx < 3 && <MedalIcon rank={idx + 1} className="w-5 h-5 shrink-0" />}
                              {optionDisplay(category, option)}
                            </span>
                            <span className="font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
  );
}
