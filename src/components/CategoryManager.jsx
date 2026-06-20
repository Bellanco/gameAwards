import React, { useState } from 'react';
import { setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../data/literals';
import { useFirestoreCategories } from '../hooks';
import { Button, Card, Alert } from './ui';
import { logError, ERROR_TYPES } from '../services/errorService';
import { tField, getCategoryTitle, hasTitle } from '../utils/localize';

/**
 * Generar UUID v4
 * @returns {string}
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const emptyOption = () => ({ id: null, value: '' });

const emptyForm = () => ({
  titleEs: '',
  titleEn: '',
  options: [emptyOption(), emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  weight: 1,
});

/**
 * CategoryManager v5 - Categorías bilingües (ES/EN)
 *
 * Modelo guardado en Firestore:
 *   { title: {es,en}, options: [{id,es,en}], optionIds, weight, orderIndex, ... }
 * Los `optionIds` se mantienen también como array plano por compatibilidad de lectura.
 *
 * @param {string} language - Idioma de la interfaz ('es' | 'en')
 * @param {Function} onClose - Callback para cerrar el panel
 */
export default function CategoryManager({ language = 'es', onClose }) {
  const t = useTranslation(language);
  const { categories, isLoading, refetch } = useFirestoreCategories(true);

  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedCategory, setDraggedCategory] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtrar categorías válidas y buscar (por título en el idioma actual)
  const validCategories = categories.filter(c => !c.isPlaceholder && hasTitle(c));

  const filteredCategories = validCategories.filter(c =>
    getCategoryTitle(c, language).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, emptyOption()] }));
  };

  const handleRemoveOption = (index) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleOptionChange = (index, value) => {
    setFormData(prev => {
      const newOptions = prev.options.map((opt, i) =>
        i === index ? { ...opt, value } : opt
      );
      return { ...prev, options: newOptions };
    });
  };

  /**
   * Guardar nueva categoría o actualizar existente.
   */
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.titleEs.trim()) {
      setErrorMessage(`${t('error')}: ${t('catNameRequired')}`);
      return;
    }

    // Una opción es válida si tiene texto.
    const validOptions = formData.options.filter(opt => opt.value.trim().length > 0);
    if (validOptions.length < 2) {
      setErrorMessage(`${t('error')}: ${t('catMinOptions')}`);
      return;
    }

    const weight = parseFloat(formData.weight);
    if (isNaN(weight) || weight <= 0) {
      setErrorMessage(`${t('error')}: ${t('catInvalidWeight')}`);
      return;
    }

    try {
      setIsSaving(true);
      const docId = editingId || generateUUID();

      // Nombres de juego en idioma único: se guarda el mismo valor en es/en
      // (mantiene el modelo {id,es,en} para que optionId y scoring no cambien).
      const options = validOptions.map((opt, idx) => {
        const value = opt.value.trim();
        return { id: opt.id || `${docId}_option_${idx}`, es: value, en: value };
      });
      const optionIds = options.map(o => o.id);

      const title = {
        es: formData.titleEs.trim(),
        en: (formData.titleEn.trim() || formData.titleEs.trim()),
      };

      // Calcular orderIndex para nuevas categorías
      let orderIndex;
      if (!editingId) {
        const indices = categories.map(c => typeof c.orderIndex === 'number' ? c.orderIndex : 0);
        orderIndex = (indices.length > 0 ? Math.max(...indices) : -1) + 1;
      }

      await setDoc(doc(db, 'categories', docId), {
        title,
        options,
        optionIds,
        weight,
        ...(editingId ? { updatedAt: new Date().toISOString() } : {
          orderIndex,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        })
      }, { merge: !editingId });

      setSuccessMessage(editingId ? t('updated') : t('created'));
      setFormData(emptyForm());
      setEditingId(null);
      await refetch();
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'CategoryManager - handleAddCategory' });
      setErrorMessage(`${t('error')}: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Eliminar categoría.
   */
  const handleDeleteCategory = async (docId) => {
    if (!window.confirm(t('catDeleteConfirm'))) return;

    try {
      setIsSaving(true);
      const validCats = categories.filter(cat => hasTitle(cat));

      if (validCats.length === 1) {
        // Si es la última, crear placeholder para mantener la colección.
        await setDoc(doc(db, 'categories', docId), {
          title: { es: '', en: '' },
          options: [],
          optionIds: [],
          weight: 1,
          isPlaceholder: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setSuccessMessage(t('catDeletedKept'));
      } else {
        await deleteDoc(doc(db, 'categories', docId));
        setSuccessMessage(t('deleted'));
      }

      await refetch();
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'CategoryManager - handleDeleteCategory' });
      setErrorMessage(`${t('error')}: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Editar categoría: cargar datos bilingües al formulario.
   */
  const handleEditCategory = (category) => {
    setEditingId(category.docId);
    setFormData({
      titleEs: tField(category.title, 'es'),
      titleEn: tField(category.title, 'en'),
      options: (category.options || []).map(opt => ({
        id: opt.id || null,
        value: tField(opt, 'es'),
      })),
      weight: category.weight || 1,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setErrorMessage('');
  };

  /**
   * Reordenar categorías por drag & drop.
   */
  const handleDropCategory = async (e, targetCategory, targetIndex) => {
    e.preventDefault();
    setHoveredIndex(null);

    if (!draggedCategory || draggedCategory.docId === targetCategory.docId) {
      setDraggedCategory(null);
      return;
    }

    try {
      setIsSaving(true);
      const draggedIndex = filteredCategories.findIndex(c => c.docId === draggedCategory.docId);

      if (draggedIndex === -1 || draggedIndex === targetIndex) {
        setDraggedCategory(null);
        return;
      }

      const newOrder = [...filteredCategories];
      const [movedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, movedItem);

      for (let i = 0; i < newOrder.length; i++) {
        await setDoc(doc(db, 'categories', newOrder[i].docId), {
          ...newOrder[i],
          orderIndex: i,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await refetch();
      setSuccessMessage(t('reordered'));
      setTimeout(() => setSuccessMessage(''), 1200);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'CategoryManager - handleDropCategory' });
      setErrorMessage(t('catReorderError'));
    } finally {
      setIsSaving(false);
      setDraggedCategory(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col theme-gradient-primary items-center justify-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 theme-border-primary"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-600 border-r-amber-700 animate-spin"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-600/20 to-orange-600/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 animate-pulse"></div>
          </div>
        </div>
        <div className="mt-12 text-center">
          <p className="text-lg font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            {t('loadingData')}
          </p>
          <p className="text-sm theme-text-secondary mt-3">{t('preparingPanel')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col theme-gradient-primary overflow-hidden">
      {/* Header */}
      <div className="theme-container-secondary theme-border-primary border-b backdrop-blur px-4 md:px-6 py-3 flex-shrink-0 z-40">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {t('categories')}
            </h1>
            <p className="theme-text-secondary text-xs md:text-sm mt-0.5">{validCategories.length} {t('activeFem')}</p>
          </div>
          <Button variant="secondary" size="md" onClick={onClose}>
            ✕ {t('back')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-hidden px-4 md:px-6 py-3">

        {/* Sidebar - List */}
        <Card className="md:col-span-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b theme-border-primary flex-shrink-0">
            <input
              type="text"
              placeholder={`${t('search')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 theme-container-secondary theme-border-primary border rounded theme-text-primary theme-placeholder text-sm focus:outline-none focus:border-amber-600/50"
              disabled={isSaving}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 p-3">
            {filteredCategories.length === 0 ? (
              <p className="theme-text-tertiary text-center text-xs py-4">
                {searchTerm ? t('notFound') : t('noCategories')}
              </p>
            ) : (
              filteredCategories.map((category, index) => (
                <div
                  key={category.docId}
                  draggable={!isSaving}
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedCategory(category); }}
                  onDragEnd={() => setDraggedCategory(null)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDragEnter={(e) => { e.preventDefault(); setHoveredIndex(index); }}
                  onDragLeave={(e) => { if (e.currentTarget === e.target) setHoveredIndex(null); }}
                  onDrop={(e) => handleDropCategory(e, category, index)}
                  className={`p-3 rounded border transition-all flex items-center gap-2 group cursor-grab ${
                    draggedCategory?.docId === category.docId && isSaving
                      ? 'bg-yellow-200/60 border-yellow-300 ring-2 ring-yellow-300 dark:bg-yellow-500/40 dark:border-yellow-400 dark:ring-yellow-400'
                      : draggedCategory?.docId === category.docId
                      ? 'bg-slate-700/20 border-slate-500 opacity-50 scale-95'
                      : hoveredIndex === index && draggedCategory && !isSaving
                      ? 'bg-yellow-100/60 border-yellow-300 ring-2 ring-yellow-300/50 dark:bg-yellow-500/30 dark:border-yellow-400 dark:ring-yellow-400/50'
                      : editingId === category.docId
                      ? 'bg-yellow-100/50 border-yellow-300/50 dark:bg-yellow-500/20 dark:border-yellow-400/50'
                      : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleEditCategory(category)}
                      disabled={isSaving}
                      className="w-full text-left mb-2 disabled:opacity-50"
                    >
                      <div className="font-semibold truncate theme-text-primary text-sm">{getCategoryTitle(category, language)}</div>
                      <div className="flex gap-3 mt-1 text-xs theme-text-tertiary">
                        <span>{category.options?.length || 0} {t('options').toLowerCase()}</span>
                        <span className="font-semibold theme-accent">{category.weight || 1}x</span>
                      </div>
                    </button>

                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => handleDeleteCategory(category.docId)}
                      loading={false}
                    >
                      {t('delete')}
                    </Button>
                  </div>

                  <div className="flex-shrink-0 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity">
                    {draggedCategory?.docId === category.docId && isSaving ? '⟳' : '⋮⋮'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t theme-border-primary theme-text-tertiary flex-shrink-0 text-center text-xs">
            {filteredCategories.length} / {validCategories.length}
          </div>
        </Card>

        {/* Form Panel */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-3 overflow-hidden min-h-0">

          {errorMessage && (
            <Alert type="error" autoClose={3000} onClose={() => setErrorMessage('')}>
              {errorMessage}
            </Alert>
          )}
          {successMessage && (
            <Alert type="success" autoClose={2500} onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}

          <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
            <Card.Header>
              <h2 className="text-lg font-bold theme-text-primary">
                {editingId ? t('edit') : t('newFem')}
              </h2>
            </Card.Header>

            <Card.Body className="flex-1 overflow-y-auto">
              <form onSubmit={handleAddCategory} className="space-y-4 flex flex-col h-full">

                {/* Título bilingüe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold theme-text-primary block mb-2">{t('categoryName')} (ES)</label>
                    <input
                      type="text"
                      value={formData.titleEs}
                      onChange={(e) => setFormData({ ...formData, titleEs: e.target.value })}
                      placeholder="ej: Juego del Año"
                      className="w-full px-4 py-3 theme-container-secondary theme-border-primary border rounded theme-text-primary theme-placeholder text-base focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold theme-text-primary block mb-2">{t('categoryName')} (EN)</label>
                    <input
                      type="text"
                      value={formData.titleEn}
                      onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                      placeholder="e.g. Game of the Year"
                      className="w-full px-4 py-3 theme-container-secondary theme-border-primary border rounded theme-text-primary theme-placeholder text-base focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Ponderación */}
                <div>
                  <label className="text-sm font-semibold theme-text-primary block mb-2">{t('weight')}</label>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 3].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({ ...formData, weight: value })}
                        disabled={isSaving}
                        className={`flex-1 py-2.5 px-3 rounded text-sm font-bold transition-all ${
                          formData.weight === value
                            ? 'theme-accent-bg text-white border border-amber-600'
                            : 'theme-container-secondary theme-text-secondary theme-border-primary border hover:border-amber-600/50'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opciones bilingües */}
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-sm font-semibold theme-text-primary block mb-2">
                    {t('options')} ({formData.options.filter(o => o.value.trim()).length})
                  </label>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <input
                          type="text"
                          value={option.value}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`${t('option')} ${index + 1}`}
                          className="flex-1 px-3 py-2 theme-container-secondary theme-border-primary border rounded theme-text-primary text-sm theme-placeholder focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
                          disabled={isSaving}
                        />
                        {formData.options.length > 2 && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                            loading={false}
                            type="button"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleAddOption}
                    loading={false}
                    className="mt-3"
                    type="button"
                  >
                    + {t('option')}
                  </Button>
                </div>

                <div className="flex gap-3 flex-shrink-0 border-t border-slate-700/50 pt-4">
                  <Button variant="primary" fullWidth loading={false} type="submit">
                    {editingId ? t('save') : t('create')}
                  </Button>
                  {editingId && (
                    <Button variant="secondary" fullWidth onClick={handleCancel} loading={false} type="button">
                      {t('cancel')}
                    </Button>
                  )}
                </div>
              </form>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
