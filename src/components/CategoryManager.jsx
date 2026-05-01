import React, { useState, useEffect } from 'react';
import { collection, setDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../data/literals';

/**
 * Generar ID único automáticamente (UUID v4)
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * CategoryManager v3 - Modern dashboard layout con sidebar + main panel
 * Diseñado para 20+ categorías sin excesivo scroll
 */
export default function CategoryManager({ language = 'es', onClose }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const t = useTranslation(language);

  // Filtrar categorías según búsqueda - ORDENADAS
  const validCategories = categories.filter(c => 
    !c.isPlaceholder && c.title && c.title.trim()
  ).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  
  const filteredCategories = validCategories.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cargar categorías desde Firestore
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const categoriesCollection = collection(db, 'categories');
      const snapshot = await getDocs(categoriesCollection);
      const allDocs = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      }));

      console.log(`📂 CategoryManager: ${snapshot.docs.length} docs encontrados`, allDocs);

      // Detectar y eliminar duplicados automáticamente por TÍTULO
      const titleGroups = {};
      const toDelete = [];

      allDocs.forEach(cat => {
        if (!cat.title || !cat.title.trim()) return; // Excluir solo si no tiene título válido
        if (!titleGroups[cat.title]) {
          titleGroups[cat.title] = [];
        }
        titleGroups[cat.title].push(cat);
      });

      // Para cada título con múltiples instancias, mantener solo la más reciente
      for (const [title, docs] of Object.entries(titleGroups)) {
        if (docs.length > 1) {
          // Ordenar por updatedAt descendente (más reciente primero)
          docs.sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
          });

          // Marcar para eliminar todos excepto el primero (más reciente)
          for (let i = 1; i < docs.length; i++) {
            toDelete.push(docs[i].docId);
            console.warn(`🗑️ Eliminando duplicado: "${title}" (${docs[i].docId})`);
          }
        }
      }

      // Eliminar duplicados automáticamente
      for (const docId of toDelete) {
        try {
          await deleteDoc(doc(db, 'categories', docId));
          console.log(`✅ Duplicado eliminado: ${docId}`);
        } catch (error) {
          console.error(`❌ Error eliminando duplicado ${docId}:`, error);
        }
      }

      // Retornar solo documentos válidos (sin duplicados)
      // NO FILTRAR POR TITLE VACÍO - permitir placeholders
      const filtered = allDocs.filter(cat => !toDelete.includes(cat.docId));
      
      console.log(`✅ CategoryManager después de limpiar: ${filtered.length} categorías`, {
        total: allDocs.length,
        placeholders: filtered.filter(c => c.isPlaceholder).length,
        validas: filtered.filter(c => !c.isPlaceholder).length,
        filtered
      });

      setCategories(filtered);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setErrorMessage('Error al cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const handleRemoveOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index, value) => {
    setFormData(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setErrorMessage('El nombre de la categoria es requerido');
      return;
    }

    const validOptions = formData.options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setErrorMessage('Debes agregar al menos 2 opciones validas');
      return;
    }

    // Validar ponderación
    const weight = parseFloat(formData.weight);
    if (isNaN(weight) || weight <= 0) {
      setErrorMessage('La ponderacion debe ser un numero mayor a 0');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      if (editingId) {
        // EDITAR: Mantener el docId original, solo actualizar campos
        console.log(`✏️ Actualizando categoria con docId: ${editingId}`);
        const optionIds = validOptions.map((_, idx) => `${editingId}_option_${idx}`);
        
        await setDoc(doc(db, 'categories', editingId), {
          title: formData.title,
          options: validOptions,
          optionIds: optionIds,
          weight: weight,
          updatedAt: new Date().toISOString()
        }, { merge: false }); // Sobrescribir completamente
        
        setSuccessMessage('Categoria actualizada exitosamente');
        setEditingId(null);
      } else {
        // CREAR: Generar UUID único como docId (no basado en título)
        const docId = generateUUID();
        console.log(`➕ Creando categoria con UUID: ${docId}`);
        
        // Generar IDs únicos para cada opción
        const optionIds = validOptions.map((_, idx) => `${docId}_option_${idx}`);

        await setDoc(doc(db, 'categories', docId), {
          title: formData.title,
          options: validOptions,
          optionIds: optionIds,
          weight: weight,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        });
        
        setSuccessMessage('Categoria creada exitosamente');
      }

      setFormData({ title: '', options: ['', '', '', '', ''], weight: 1 });
      await loadCategories();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error guardando categoria:', error);
      setErrorMessage('Error al guardar la categoria: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (docId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🗑️ Eliminando categoria con docId: ${docId}`);
      
      // Contar cuántas categorías válidas hay (excluyendo vacías)
      const validCategories = categories.filter(cat => cat.title && cat.title.trim());
      
      if (validCategories.length === 1) {
        // Si es la última, crear un placeholder vacío en su lugar
        console.log(`⚠️ Última categoría - creando placeholder vacío`);
        await setDoc(doc(db, 'categories', docId), {
          title: '',
          options: [],
          optionIds: [],
          weight: 1,
          isPlaceholder: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setSuccessMessage('Categoría eliminada - tabla mantenida');
      } else {
        // Si no es la última, eliminar normalmente
        await deleteDoc(doc(db, 'categories', docId));
        setSuccessMessage('Categoría eliminada exitosamente');
      }
      
      await loadCategories();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      setErrorMessage('Error al eliminar la categoría: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingId(category.docId); // Usar docId de Firestore, no ID generado
    setFormData({
      title: category.title,
      options: category.options || [],
      weight: category.weight || 1
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ title: '', options: ['', '', '', '', ''], weight: 1 });
    setErrorMessage('');
  };

  const handleDragStart = (e, category) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setHoveredIndex(index);
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget === e.target) {
      setHoveredIndex(null);
    }
  };

  const handleDropCategory = async (e, targetCategory, targetIndex) => {
    e.preventDefault();
    setHoveredIndex(null);

    if (!draggedCategory || draggedCategory.docId === targetCategory.docId) {
      setDraggedCategory(null);
      return;
    }

    try {
      setIsLoading(true);

      // Obtener la posición actual del item arrastrado
      const draggedIndex = filteredCategories.findIndex(c => c.docId === draggedCategory.docId);
      
      if (draggedIndex === -1 || draggedIndex === targetIndex) {
        setDraggedCategory(null);
        return;
      }

      // Crear nueva orden: mover item de draggedIndex a targetIndex
      const newOrder = [...filteredCategories];
      const [movedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, movedItem);

      // Recalcular orderIndex para todos (0, 1, 2, 3...)
      const updates = newOrder.map((category, index) => ({
        docId: category.docId,
        data: category,
        newOrderIndex: index
      }));

      // Actualizar en Firestore
      for (const update of updates) {
        await setDoc(doc(db, 'categories', update.docId), {
          ...update.data,
          orderIndex: update.newOrderIndex,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await loadCategories();
      setSuccessMessage('✓ Orden actualizado');
      setTimeout(() => setSuccessMessage(''), 1200);
    } catch (error) {
      console.error('❌ Error en drag & drop:', error);
      setErrorMessage('Error al reordenar');
      setTimeout(() => setErrorMessage(''), 2000);
    } finally {
      setIsLoading(false);
      setDraggedCategory(null);
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-black/90 to-slate-900/50 border-b border-slate-700/50 backdrop-blur px-4 md:px-6 py-3 flex-shrink-0 z-40">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Categorías
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">{validCategories.length} activas</p>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-700/50 hover:bg-slate-600 border border-slate-600/50 rounded-lg font-semibold text-sm transition-all"
          >
            ✕ Volver
          </button>
        </div>
      </div>

      {/* Contenido Principal - Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-hidden px-4 md:px-6 py-3">
        
        {/* Sidebar Izquierdo - Lista de Categorías */}
        <div className="md:col-span-1 bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden flex flex-col">
          {/* Búsqueda */}
          <div className="p-3 border-b border-slate-700/50 flex-shrink-0">
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:border-yellow-400/50"
            />
          </div>

          {/* Lista compacta de categorías */}
          <div className="flex-1 overflow-y-auto space-y-1.5 p-3">
            {filteredCategories.length === 0 ? (
              <p className="text-slate-400 text-center text-xs py-4">
                {searchTerm ? 'No encontradas' : 'Sin categorías'}
              </p>
            ) : (
              filteredCategories.map((category, index) => (
                <div
                  key={category.docId}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropCategory(e, category, index)}
                  className={`p-3 rounded border transition-all flex items-center gap-2 group relative ${
                    draggedCategory?.docId === category.docId && isLoading
                      ? 'bg-yellow-500/40 border-yellow-400 ring-2 ring-yellow-400'
                      : draggedCategory?.docId === category.docId
                      ? 'bg-slate-700/20 border-slate-500 opacity-50 scale-95'
                      : hoveredIndex === index && draggedCategory && !isLoading
                      ? 'bg-yellow-500/30 border-yellow-400 ring-2 ring-yellow-400/50'
                      : editingId === category.docId
                      ? 'bg-yellow-500/20 border-yellow-400/50'
                      : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'
                  }`}
                >
                  {/* Loading overlay cuando se está procesando */}
                  {draggedCategory?.docId === category.docId && isLoading && (
                    <div className="absolute inset-0 rounded bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
                      <div className="animate-spin text-2xl">⚙️</div>
                    </div>
                  )}

                  {/* Contenido Principal */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleEditCategory(category)}
                      disabled={isLoading}
                      className="w-full text-left mb-2 disabled:opacity-50"
                    >
                      <div className="font-semibold truncate text-white text-sm">{category.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {category.options?.length || 0} opciones
                      </div>
                    </button>
                    
                    {/* Botón eliminar */}
                    <button
                      onClick={() => handleDeleteCategory(category.docId)}
                      disabled={isLoading}
                      className="w-full py-1.5 px-2 bg-red-600/70 hover:bg-red-600 disabled:opacity-50 text-white text-xs rounded transition-all font-semibold"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </div>

                  {/* Drag Handle - Esquina Derecha */}
                  <div
                    draggable={!isLoading}
                    onDragStart={(e) => handleDragStart(e, category)}
                    onDragEnd={() => setDraggedCategory(null)}
                    className={`flex-shrink-0 p-2 rounded transition-colors opacity-50 group-hover:opacity-100 ${
                      isLoading ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:bg-slate-600/50'
                    }`}
                    title={isLoading ? 'Procesando...' : 'Arrastra para reordenar'}
                  >
                    <span className="text-slate-400 hover:text-yellow-400 text-lg leading-none transition-colors">
                      {draggedCategory?.docId === category.docId && isLoading ? '⟳' : '⋮⋮'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Contador */}
          <div className="p-3 border-t border-slate-700/50 text-xs text-slate-400 flex-shrink-0 text-center">
            {filteredCategories.length} de {validCategories.length}
          </div>
        </div>

        {/* Panel Central - Formulario + Grid de Categorías */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-3 overflow-hidden min-h-0">
          
          {/* Mensajes */}
          {errorMessage && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm flex-shrink-0">
              ⚠️ {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded text-green-300 text-sm flex-shrink-0">
              ✓ {successMessage}
            </div>
          )}

            {/* Formulario Compacto - PRINCIPAL */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-4 flex-1 flex flex-col overflow-hidden min-h-0">
              <h2 className="text-lg font-bold text-white mb-4 flex-shrink-0">
                {editingId ? '✏️ Editar' : '➕ Nueva'}
              </h2>

              <form onSubmit={handleAddCategory} className="space-y-4 flex-1 overflow-y-auto flex flex-col">
                <div>
                  <label className="text-sm font-semibold text-slate-200 block mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="ej: Game of the Year"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded text-white text-base placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-200 block mb-2">Peso</label>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 3].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({ ...formData, weight: value })}
                        disabled={isLoading}
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
                  <label className="text-sm font-semibold text-slate-200 block mb-2">Opciones ({formData.options.filter(o => o.trim()).length})</label>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Opción ${index + 1}`}
                          className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30"
                          disabled={isLoading}
                        />
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            disabled={isLoading}
                            className="px-3 py-2 bg-red-600/70 hover:bg-red-600 text-white text-sm rounded transition-all font-semibold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    disabled={isLoading}
                    className="mt-3 w-full py-2.5 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 font-semibold text-sm rounded transition-all"
                  >
                    + Agregar Opción
                  </button>
                </div>

                <div className="flex gap-3 pt-4 flex-shrink-0 border-t border-slate-700/50 mt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-yellow-500/80 hover:bg-yellow-500 disabled:opacity-50 text-slate-900 font-bold text-base rounded transition-all"
                  >
                    {editingId ? 'Guardar' : 'Crear'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex-1 py-3 px-4 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-base rounded transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
        </div>
      </div>
    </div>
  );
}
