import React from 'react';
import { useTranslation } from '../../data/literals';
import { useAppContext } from '../../context/AppContext';
import { Button, Card, Alert } from '../ui';
import { TextInput } from '../form';

/**
 * Formulario de alta/edición de una categoría: título bilingüe, ponderación y
 * nominados.
 */
export default function CategoryForm({
  formData,
  setFormData,
  editingId,
  isSaving,
  errorMessage,
  setErrorMessage,
  successMessage,
  setSuccessMessage,
  onSubmit,
  onCancel,
  onAddOption,
  onRemoveOption,
  onOptionChange,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  return (
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
        <form onSubmit={onSubmit} className="space-y-4 flex flex-col h-full">

          {/* Título bilingüe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label={`${t('categoryName')} (ES)`}
              name="categoryTitleEs"
              value={formData.titleEs}
              onChange={(e) => setFormData({ ...formData, titleEs: e.target.value })}
              placeholder="ej: Juego del Año"
              disabled={isSaving}
              required
            />
            <TextInput
              label={`${t('categoryName')} (EN)`}
              name="categoryTitleEn"
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              placeholder="e.g. Game of the Year"
              disabled={isSaving}
              help={t('catTitleEnHelp')}
            />
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
                      ? 'theme-accent-bg theme-text-inverse border theme-accent-border'
                      : 'theme-container-secondary theme-text-secondary theme-border-primary border hover:theme-border-secondary'
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
                  <TextInput
                    name={`categoryOption${index}`}
                    value={option.value}
                    onChange={(e) => onOptionChange(index, e.target.value)}
                    placeholder={`${t('option')} ${index + 1}`}
                    disabled={isSaving}
                  />
                  {formData.options.length > 2 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onRemoveOption(index)}
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
              onClick={onAddOption}
              loading={false}
              className="mt-3"
              type="button"
            >
              + {t('option')}
            </Button>
          </div>

          <div className="flex gap-3 flex-shrink-0 border-t theme-border-primary pt-4">
            <Button variant="primary" fullWidth loading={false} type="submit">
              {editingId ? t('save') : t('create')}
            </Button>
            {editingId && (
              <Button variant="secondary" fullWidth onClick={onCancel} loading={false} type="button">
                {t('cancel')}
              </Button>
            )}
          </div>
        </form>
      </Card.Body>
    </Card>
  </div>
  );
}
