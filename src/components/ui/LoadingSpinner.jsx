/**
 * Componente LoadingSpinner - Indicador de carga reutilizable
 * 
 * @typedef {Object} LoadingSpinnerProps
 * @property {string} [text='Cargando...'] - Texto a mostrar
 * @property {boolean} [fullScreen=false] - Modo pantalla completa
 * @property {string} [size='lg'] - Tamaño del spinner (sm, md, lg)
 * @property {string} [className] - Clases adicionales
 * 
 * @param {LoadingSpinnerProps} props
 * @returns {React.ReactElement}
 * 
 * Uso: <LoadingSpinner text="Procesando..." fullScreen={true} />
 */

import React from 'react';

export default function LoadingSpinner({
  text = '',
  fullScreen = false
}) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="animate-spin text-4xl">●</div>
      {text && <p className="theme-text-tertiary text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen theme-gradient-primary flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
