import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { getCategoryTitle } from '../../utils/localize';
import { Button, Card } from '../ui';

/**
 * Lista lateral de categorías: buscar, reordenar (flechas y arrastrar) y elegir
 * cuál se edita. El nº que se ve es `orderIndex + 1`, el mismo orden que consume
 * el resto de la app.
 */
export default function CategoryList({
  orderedCategories,
  filteredCategories,
  validCategories,
  searchTerm,
  setSearchTerm,
  searching,
  isSaving,
  editingId,
  draggedCategory,
  setDraggedCategory,
  hoveredIndex,
  setHoveredIndex,
  onEdit,
  onDelete,
  onMove,
  onDrop,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  return (
  <Card className="md:col-span-1 flex flex-col overflow-hidden">
    <div className="p-3 border-b theme-border-primary shrink-0">
      <input
        type="text"
        placeholder={`${t('search')}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 theme-container-secondary theme-border-primary border rounded-sm theme-text-primary theme-placeholder text-sm focus:outline-hidden focus:border-(--color-accent) focus-visible:ring-2 focus-visible:ring-(--color-accent)/40"
        disabled={isSaving}
      />
    </div>

    <div className="flex-1 overflow-y-auto space-y-1.5 p-3">
      {filteredCategories.length === 0 ? (
        <p className="theme-text-secondary text-center text-sm py-4">
          {searchTerm ? t('notFound') : t('noCategories')}
        </p>
      ) : (
        filteredCategories.map((category, index) => {
          const orderNum = orderedCategories.findIndex(c => c.docId === category.docId) + 1;
          return (
          <div
            key={category.docId}
            draggable={!isSaving && !searching}
            onDragStart={(e) => { if (searching) return; e.dataTransfer.effectAllowed = 'move'; setDraggedCategory(category); }}
            onDragEnd={() => setDraggedCategory(null)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDragEnter={(e) => { e.preventDefault(); setHoveredIndex(index); }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setHoveredIndex(null); }}
            onDrop={(e) => onDrop(e, category)}
            className={`p-3 rounded border transition-all flex items-center gap-2 group ${searching ? '' : 'cursor-grab'} ${
              draggedCategory?.docId === category.docId && isSaving
                ? 'bg-status-warning-light border-status-warning ring-2 ring-(--color-warning)'
                : draggedCategory?.docId === category.docId
                ? 'bg-(--bg-tertiary) border-(--border-secondary) opacity-50 scale-95'
                : hoveredIndex === index && draggedCategory && !isSaving
                ? 'bg-status-warning-light border-status-warning ring-2 ring-(--color-warning)/50'
                : editingId === category.docId
                ? 'bg-status-warning-light border-status-warning/60'
                : 'theme-card hover:border-(--border-secondary)'
            }`}
          >
            {/* Nº de orden (orderIndex + 1) */}
            <div
              className="shrink-0 w-8 h-8 rounded-full theme-accent-bg theme-text-inverse text-sm font-bold flex items-center justify-center"
              title={t('order')}
            >
              {orderNum}
            </div>

            <div className="flex-1 min-w-0">
              <button
                onClick={() => onEdit(category)}
                disabled={isSaving}
                className="w-full text-left mb-2 disabled:opacity-50"
              >
                <div className="font-semibold truncate theme-text-primary text-sm">{getCategoryTitle(category, language)}</div>
                <div className="flex gap-3 mt-1 text-sm theme-text-secondary">
                  <span>{category.options?.length || 0} {t('options').toLowerCase()}</span>
                  <span className="font-semibold theme-accent">{category.weight || 1}x</span>
                </div>
              </button>

              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={() => onDelete(category.docId)}
                loading={false}
              >
                {t('delete')}
              </Button>
            </div>

            {/* Subir / bajar (reasigna el nº de orden) */}
            <div className="shrink-0 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onMove(category.docId, 'up')}
                disabled={isSaving || searching || orderNum === 1}
                title={t('moveUp')}
                aria-label={t('moveUp')}
                className="w-8 h-7 rounded-sm theme-container-secondary theme-border-primary border text-sm theme-text-secondary hover:theme-border-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => onMove(category.docId, 'down')}
                disabled={isSaving || searching || orderNum === orderedCategories.length}
                title={t('moveDown')}
                aria-label={t('moveDown')}
                className="w-8 h-7 rounded-sm theme-container-secondary theme-border-primary border text-sm theme-text-secondary hover:theme-border-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▼
              </button>
            </div>
          </div>
          );
        })
      )}
    </div>

    <div className="p-3 border-t theme-border-primary theme-text-secondary shrink-0 text-center text-sm">
      {filteredCategories.length} / {validCategories.length}
      {searching && <div className="mt-1 theme-accent">{t('reorderSearchHint')}</div>}
    </div>
  </Card>
  );
}
