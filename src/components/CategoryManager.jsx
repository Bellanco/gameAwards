import React, { useState } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { useFirestoreCategories } from '../hooks';
import { Button } from './ui';
import CategoryList from './admin/CategoryList';
import CategoryForm from './admin/CategoryForm';
import { logError, ERROR_TYPES } from '../services/errorService';
import { tField, getCategoryTitle, hasTitle } from '../utils/localize';
import {
  sortCategoriesByOrder,
  saveCategory,
  deleteCategory,
  reorderCategories,
} from '../services/categoriesService';
import { CloseIcon } from './Icons';

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
 *   { title: {es,en}, options: [{id,name}], optionIds, weight, orderIndex, ... }
 * El título es bilingüe; los nombres de opción son únicos ({id,name}).
 * Los `optionIds` se mantienen también como array plano por compatibilidad de lectura.
 *
 * @param {string} language - Idioma de la interfaz ('es' | 'en')
 * @param {Function} onClose - Callback para cerrar el panel
 */
export default function CategoryManager({ onClose }) {
  const { language } = useAppContext();
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

  // Orden global por orderIndex (de menor a mayor) -> es el nº de orden visible
  // y el que consume el resto de la app.
  const validCategories = categories.filter(c => !c.isPlaceholder && hasTitle(c));
  const orderedCategories = sortCategoriesByOrder(validCategories);

  const searching = searchTerm.trim().length > 0;
  const filteredCategories = orderedCategories.filter(c =>
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

      // Las nuevas van al final del orden actual.
      const indices = categories.map(c => typeof c.orderIndex === 'number' ? c.orderIndex : 0);
      const orderIndex = (indices.length > 0 ? Math.max(...indices) : -1) + 1;

      await saveCategory({
        docId: editingId,
        titleEs: formData.titleEs,
        titleEn: formData.titleEn,
        options: validOptions,
        weight,
        orderIndex,
      });

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
      const isLastWithTitle = categories.filter(cat => hasTitle(cat)).length === 1;

      const { kept } = await deleteCategory(docId, isLastWithTitle);
      setSuccessMessage(kept ? t('catDeletedKept') : t('deleted'));

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
   * Persiste un nuevo orden: reasigna orderIndex contiguo 0..n-1 a TODAS las
   * categorías válidas en un único batch (garantiza una secuencia limpia, sin
   * huecos ni duplicados) y refresca.
   */
  const persistOrder = async (ordered) => {
    try {
      setIsSaving(true);
      await reorderCategories(ordered);
      await refetch();
      setSuccessMessage(t('reordered'));
      setTimeout(() => setSuccessMessage(''), 1200);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'CategoryManager - persistOrder' });
      setErrorMessage(t('catReorderError'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Subir/bajar una categoría una posición en el orden global.
   * @param {string} docId
   * @param {'up'|'down'} direction
   */
  const moveCategory = (docId, direction) => {
    if (isSaving || searching) return;
    const idx = orderedCategories.findIndex(c => c.docId === docId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= orderedCategories.length) return;
    const arr = [...orderedCategories];
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    persistOrder(arr);
  };

  /**
   * Reordenar por drag & drop (deshabilitado mientras hay búsqueda activa,
   * porque el orden es global y la lista estaría filtrada).
   */
  const handleDropCategory = async (e, targetCategory) => {
    e.preventDefault();
    setHoveredIndex(null);
    const dragged = draggedCategory;
    setDraggedCategory(null);
    if (searching || !dragged || dragged.docId === targetCategory.docId) return;

    const arr = [...orderedCategories];
    const from = arr.findIndex(c => c.docId === dragged.docId);
    const to = arr.findIndex(c => c.docId === targetCategory.docId);
    if (from < 0 || to < 0) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    await persistOrder(arr);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col theme-gradient-primary items-center justify-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 theme-border-primary"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-(--color-accent) border-r-(--color-secondary) animate-spin"></div>
          <div className="absolute inset-2 rounded-full bg-status-warning-light flex items-center justify-center">
            <div className="w-3 h-3 rounded-full theme-accent-bg theme-flicker"></div>
          </div>
        </div>
        <div className="mt-12 text-center">
          <p className="text-lg font-semibold theme-accent theme-display uppercase">
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
      <div className="theme-container-secondary theme-border-primary border-b backdrop-blur-sm px-4 md:px-6 py-3 shrink-0 z-40">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black theme-accent theme-display uppercase">
              {t('categories')}
            </h1>
            <p className="theme-text-secondary text-sm mt-0.5">{validCategories.length} {t('activeFem')}</p>
          </div>
          <Button variant="secondary" size="md" onClick={onClose}>
            <span className="flex items-center gap-1.5">
              <CloseIcon className="w-4 h-4" />
              {t('back')}
            </span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-hidden px-4 md:px-6 py-3">

        <CategoryList
          orderedCategories={orderedCategories}
          filteredCategories={filteredCategories}
          validCategories={validCategories}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searching={searching}
          isSaving={isSaving}
          editingId={editingId}
          draggedCategory={draggedCategory}
          setDraggedCategory={setDraggedCategory}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
          onMove={moveCategory}
          onDrop={handleDropCategory}
        />

        <CategoryForm
          formData={formData}
          setFormData={setFormData}
          editingId={editingId}
          isSaving={isSaving}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
          onSubmit={handleAddCategory}
          onCancel={handleCancel}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
          onOptionChange={handleOptionChange}
        />
      </div>
    </div>
  );
}
