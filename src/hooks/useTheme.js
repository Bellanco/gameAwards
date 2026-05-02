/**
 * useTheme - Hook personalizado para gestionar el tema de la aplicación
 * Centraliza: estado, localStorage, aplicación de clase dark, y logs
 */
import { useState, useEffect } from 'react';
import logger from '../services/loggerService';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Intentar cargar del localStorage
    const savedTheme = localStorage.getItem('appTheme');
    logger.log('🎨 [useTheme] Inicializando tema...', { savedTheme });
    
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      logger.log('🎨 [useTheme] Usando tema guardado:', savedTheme);
      return savedTheme;
    }
    
    // Si no hay guardado, detectar el tema del sistema
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      logger.log('🎨 [useTheme] Detectado tema del sistema:', systemTheme);
      return systemTheme;
    }
    
    // Default a claro
    logger.log('🎨 [useTheme] Usando tema por defecto: light');
    return 'light';
  });

  /**
   * Aplicar tema al cargar y cuando cambia
   */
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  /**
   * Cambiar entre tema claro y oscuro
   */
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    logger.log('🎨 [useTheme] Cambiando tema de', theme, 'a', newTheme);
    setTheme(newTheme);
  };

  return { theme, toggleTheme };
}
