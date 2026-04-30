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
 * CategoryManager v2 - Campos individuales para opciones y ponderación
 */
export default function CategoryManager({ language = 'es', onClose }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    options: ['', '', '', '', ''],
    weight: 1
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const t = useTranslation(language);

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
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">Gestor de Categorías</h1>
              <p className="text-slate-400 text-sm">Crear, editar y eliminar categorías de la porra</p>
            </div>
            <button
              onClick={onClose}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-sm transition-all"
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Mensajes */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>

            <form onSubmit={handleAddCategory} className="space-y-4">
              {/* Nombre de categoría */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ej: Game of the Year"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500"
                  disabled={isLoading}
                />
              </div>

              {/* Ponderación */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Ponderación (weight)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })}
                  placeholder="1"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-400 mt-1">Valor por defecto: 1. Aumenta para que sea más importante.</p>
              </div>

              {/* Opciones */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Opciones
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Opción ${index + 1}`}
                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500"
                        disabled={isLoading}
                      />
                      {formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          disabled={isLoading}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Botón agregar opción */}
                <button
                  type="button"
                  onClick={handleAddOption}
                  disabled={isLoading}
                  className="mt-3 w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-semibold rounded-lg transition-all"
                >
                  + Agregar Opción
                </button>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-all"
                >
                  {editingId ? 'Actualizar' : 'Crear Categoría'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Categorías */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Categorías Existentes ({categories.filter(c => !c.isPlaceholder && c.title && c.title.trim()).length})
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {categories.filter(c => !c.isPlaceholder && c.title && c.title.trim()).length === 0 ? (
                <p className="text-slate-400 text-center py-8">No hay categorías aún</p>
              ) : (
                categories.filter(c => !c.isPlaceholder && c.title && c.title.trim()).map(category => (
                  <div
                    key={category.docId}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-yellow-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{category.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {category.options?.length || 0} opciones • Ponderación: {category.weight || 1}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {category.options?.slice(0, 3).map((option, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-slate-600 px-2 py-1 rounded text-slate-200"
                            >
                              {option}
                            </span>
                          ))}
                          {(category.options?.length || 0) > 3 && (
                            <span className="text-xs text-slate-400 px-2 py-1">
                              +{(category.options?.length || 0) - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          disabled={isLoading}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded transition-all"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.docId)}
                          disabled={isLoading}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded transition-all"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
