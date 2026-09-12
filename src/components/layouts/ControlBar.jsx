import React from 'react';
import ThemeLanguageControls from '../ui/ThemeLanguageControls';

/**
 * ControlBar - Barra de controles flotante en la esquina superior derecha.
 * Idioma y tema salen de AppContext; este componente solo aporta la posición.
 */
export default function ControlBar() {
  return <ThemeLanguageControls className="absolute top-4 right-4 z-50 flex gap-2" />;
}
