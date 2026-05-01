import React, { useState } from 'react';
import { setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../data/literals';
import { useFirestoreCategories } from '../hooks';
import { Button, Card, LoadingSpinner, Alert } from './ui';
import { logError, ERROR_TYPES } from '../services/errorService';

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

/**
 * CategoryManager v4 - Refactorizado con hooks y componentes UI reutilizables
 * 
 * @component
 * @param {string} language - Idioma actual ('es' | 'en')
 * @param {Function} onClose - Callback para cerrar el panel
 * @returns {React.ReactElement}
 */
export default function CategoryManager({ language = 'es', onClose }) {
  const t = useTranslation(language);
  const { categories, isLoading, refetch } = useFirestoreCategories(true);
  
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedCategory, setDraggedCategory] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    options: ['', '', '', '', ''],
    weight: 1
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtrar categorías válidas y buscar
  const validCategories = categories
    .filter(c => !c.isPlaceholder && c.title && c.title.trim());
  
  const filteredCategories = validCategories.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Agregar opción al formulario
   */
  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  /**
   * Remover opción del formulario
   */
  const handleRemoveOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  /**
   * Cambiar valor de opción
   */
  const handleOptionChange = (index, value) => {
    setFormData(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  /**
   * Guardar nueva categoría o actualizar existente
   */
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validaciones
    if (!formData.title.trim()) {
      setErrorMessage(t('error') + ': ' + 'Nombre requerido');
      return;
    }

    const validOptions = formData.options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setErrorMessage(t('error') + ': Al menos 2 opciones');
      return;
    }

    const weight = parseFloat(formData.weight);
    if (isNaN(weight) || weight <= 0) {
      setErrorMessage(t('error') + ': Peso inválido');
      return;
    }

    try {
      setIsSaving(true);
      const docId = editingId || generateUUID();
      const optionIds = validOptions.map((_, idx) => `${docId}_option_${idx}`);
      
      // Calcular orderIndex para nuevas categorías
      let orderIndex;
      if (!editingId) {
        const indices = categories.map(c => typeof c.orderIndex === 'number' ? c.orderIndex : 0);
        orderIndex = (indices.length > 0 ? Math.max(...indices) : -1) + 1;
      }
      
      await setDoc(doc(db, 'categories', docId), {
        title: formData.title,
        options: validOptions,
        optionIds,
        weight,
        ...(editingId ? { updatedAt: new Date().toISOString() } : {
          orderIndex,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        })
      }, { merge: !editingId });

      setSuccessMessage(editingId ? 'Actualizado' : 'Creado');
      setFormData({ title: '', options: ['', '', '', '', ''], weight: 1 });
      setEditingId(null);
      await refetch();
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'CategoryManager - handleAddCategory' });
      setErrorMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Eliminar categoría
   */
  const handleDeleteCategory = async (docId) => {
    if (!window.confirm('¿Eliminar categoría?')) return;

    try {
      setIsSaving(true);
      const validCats = categories.filter(cat => cat.title && cat.title.trim());
      
      if (validCats.length === 1) {
        // Si es la última, crear placeholder
        await setDoc(doc(db, 'categories', docId), {
          title: '',
          options: [],
          optionIds: [],
          weight: 1,
          isPlaceholder: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setSuccessMessage('Eliminada - tabla mantenida');
      } else {
        await deleteDoc(doc(db, 'categories', docId));
        setSuccessMessage('Eliminada');
      }
      
      await refetch();
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'CategoryManager - handleDeleteCategory' });
      setErrorMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Editar categoría
   */
  const handleEditCategory = (category) => {
    setEditingId(category.docId);
    setFormData({
      title: category.title,
      options: category.options || [],
      weight: category.weight || 1
    });
  };

  /**
   * Cancelar edición
   */
  const handleCancel = () => {
    setEditingId(null);
    setFormData({ title: '', options: ['', '', '', '', ''], weight: 1 });
    setErrorMessage('');
  };

  /**
   * Reordenar categorías por drag & drop
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
      setSuccessMessage('✓ Reordenado');
      setTimeout(() => setSuccessMessage(''), 1200);
    } catch (err) {
      logError(ERROR_TYPES.FIRESTORE_ERROR, err, { context: 'CategoryManager - handleDropCategory' });
      setErrorMessage('Error al reordenar');
    } finally {
      setIsSaving(false);
      setDraggedCategory(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text={t('loadingData')} fullScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-black/90 to-slate-900/50 border-b border-slate-700/50 backdrop-blur px-4 md:px-6 py-3 flex-shrink-0 z-40">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {t('categories')}
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">{validCategories.length} activas</p>
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
          <div className="p-3 border-b border-slate-700/50 flex-shrink-0">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:border-yellow-400/50"
              disabled={isSaving}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 p-3">
            {filteredCategories.length === 0 ? (
              <p className="text-slate-400 text-center text-xs py-4">
                {searchTerm ? 'No encontradas' : 'Sin categorías'}
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
                      ? 'bg-yellow-500/40 border-yellow-400 ring-2 ring-yellow-400'
                      : draggedCategory?.docId === category.docId
                      ? 'bg-slate-700/20 border-slate-500 opacity-50 scale-95'
                      : hoveredIndex === index && draggedCategory && !isSaving
                      ? 'bg-yellow-500/30 border-yellow-400 ring-2 ring-yellow-400/50'
                      : editingId === category.docId
                      ? 'bg-yellow-500/20 border-yellow-400/50'
                      : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleEditCategory(category)}
                      disabled={isSaving}
                      className="w-full text-left mb-2 disabled:opacity-50"
                    >
                      <div className="font-semibold truncate text-white text-sm">{category.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{category.options?.length || 0} opciones</div>
                    </button>
                    
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => handleDeleteCategory(category.docId)}
                      loading={isSaving}
                    >
                      {t('delete') || 'Eliminar'}
                    </Button>
                  </div>

                  <div className="flex-shrink-0 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity">
                    {draggedCategory?.docId === category.docId && isSaving ? '⟳' : '⋮⋮'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-700/50 text-xs text-slate-400 flex-shrink-0 text-center">
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
              <h2 className="text-lg font-bold text-white">
                {editingId ? '✏️ Editar' : '➕ Nueva'}
              </h2>
            </Card.Header>
            
            <Card.Body className="flex-1 overflow-y-auto">
              <form onSubmit={handleAddCategory} className="space-y-4 flex flex-col h-full">
                
                <div>
                  <label className="text-sm font-semibold text-slate-200 block mb-2">{t('categoryTitle') || 'Nombre'}</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="ej: Game of the Year"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded text-white text-base placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-200 block mb-2">{t('weight') || 'Peso'}</label>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 3].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({ ...formData, weight: value })}
                        disabled={isSaving}
                        className={`flex-1 py-2.5 px-3 rounded text-sm font-bold transition-all ${
                          formData.weight === value
                            ? 'bg-yellow-500/80 text-slate-900 border border-yellow-400'
                            : 'bg-slate-700/30 text-slate-300 border border-slate-600/30 hover:border-slate-500/50'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-sm font-semibold text-slate-200 block mb-2">
                    {t('options') || 'Opciones'} ({formData.options.filter(o => o.trim()).length})
                  </label>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Opción ${index + 1}`}
                          className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30"
                          disabled={isSaving}
                        />
                        {formData.options.length > 2 && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                            loading={isSaving}
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
                    loading={isSaving}
                    className="mt-3"
                  >
                    + Opción
                  </Button>
                </div>

                <div className="flex gap-3 flex-shrink-0 border-t border-slate-700/50 pt-4">
                  <Button
                    variant="primary"
                    fullWidth
                    loading={isSaving}
                    type="submit"
                  >
                    {editingId ? 'Guardar' : 'Crear'}
                  </Button>
                  {editingId && (
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={handleCancel}
                      loading={isSaving}
                    >
                      {t('cancel') || 'Cancelar'}
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
