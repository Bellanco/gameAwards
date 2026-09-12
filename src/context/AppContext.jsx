/**
 * AppContext - Idioma y tema, disponibles en todo el árbol.
 *
 * Antes cada pantalla recibía y reenviaba `language`, `onToggleLanguage`,
 * `theme` y `onToggleTheme`: 4 props × 9 pantallas = 36 puntos de mantenimiento
 * para dos valores globales, y la razón de que los botones de tema/idioma
 * estuvieran copiados a mano en cuatro sitios.
 *
 * El estado sigue viviendo en `App.jsx` (regla 1 del proyecto: App es la única
 * fuente de verdad); esto solo evita el trasiego por props.
 */

import React, { createContext, useContext, useMemo } from 'react';

const AppContext = createContext(null);

/**
 * @param {Object} props
 * @param {string} props.language - 'es' | 'en'
 * @param {Function} props.onToggleLanguage
 * @param {string} props.theme - 'light' | 'dark'
 * @param {Function} props.onToggleTheme
 */
export function AppProvider({ language, onToggleLanguage, theme, onToggleTheme, children }) {
  const value = useMemo(
    () => ({ language, onToggleLanguage, theme, onToggleTheme }),
    [language, onToggleLanguage, theme, onToggleTheme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Idioma y tema actuales.
 *
 * Fuera del proveedor devuelve valores por defecto seguros en vez de lanzar: hay
 * componentes (ErrorBoundary, pruebas aisladas) que se montan sin él y no deben
 * romperse por eso.
 *
 * @returns {{language: string, onToggleLanguage: Function, theme: string, onToggleTheme: Function}}
 */
export function useAppContext() {
  return (
    useContext(AppContext) ?? {
      language: 'es',
      onToggleLanguage: () => {},
      theme: 'dark',
      onToggleTheme: () => {},
    }
  );
}
