import React from 'react';
import { getTranslations } from '../data/literals';
import { logError, ERROR_TYPES } from '../services/errorService';

/**
 * ErrorBoundary - Captura errores de render en el árbol de React y muestra
 * una pantalla de recuperación en vez de dejar la app en blanco.
 *
 * Registra el error vía errorService (logError) para que llegue a Analytics y
 * al log local. El idioma del fallback se toma de localStorage (mismo criterio
 * que App.jsx); por defecto, español.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logError(ERROR_TYPES.COMPONENT_ERROR, error, {
      componentStack: info?.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const language = localStorage.getItem('appLanguage') || 'es';
    const t = getTranslations(language);

    return (
      <div className="min-h-screen theme-gradient-primary flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold theme-text-primary mb-2">{t.unexpectedError}</h1>
          <p className="theme-text-tertiary mb-6">{t.unexpectedErrorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="py-2.5 px-6 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {t.reloadPage}
          </button>
        </div>
      </div>
    );
  }
}
