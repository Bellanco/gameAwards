import React from 'react';
import ControlBar from './ControlBar';

/**
 * ScreenLayout - Componente layout reutilizable para pantallas
 * Proporciona estructura: ControlBar + Header + Content + Footer
 * 
 * @component
 * @param {React.ReactNode} children - Contenido principal
 * @param {string} language - Idioma actual
 * @param {Function} onToggleLanguage - Callback para cambiar idioma
 * @param {string} theme - Tema actual
 * @param {Function} onToggleTheme - Callback para cambiar tema
 * @param {React.ReactNode} header - Componente de encabezado (opcional)
 * @param {React.ReactNode} footer - Componente de pie (opcional)
 * @param {string} backgroundImage - URL de imagen de fondo para header (opcional)
 * @param {boolean} showControlBar - Mostrar barra de controles (default: true)
 * @param {string} containerClass - Clases personalizadas para contenedor principal
 * @returns {React.ReactElement}
 */
export default function ScreenLayout({
  children,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  header = null,
  footer = null,
  backgroundImage = null,
  showControlBar = true,
  containerClass = 'min-h-screen theme-gradient-primary flex flex-col'
}) {
  return (
    <div className={containerClass}>
      {/* Control Bar - Idioma y Tema */}
      {showControlBar && (
        <ControlBar 
          language={language} 
          onToggleLanguage={onToggleLanguage}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      )}

      {/* Header - Si se proporciona */}
      {header && (
        <header className="flex-shrink-0 theme-header theme-border-primary border-b relative z-40">
          {backgroundImage && (
            <div className="absolute inset-0 overflow-hidden opacity-30">
              <img
                src={backgroundImage}
                alt="header background"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/1920x400/1f2937/666666?text=Header';
                }}
              />
            </div>
          )}
          <div className="relative">
            {header}
          </div>
        </header>
      )}

      {/* Content - Parte flexible */}
      <main className="flex-1 flex flex-col overflow-auto w-full">
        {children}
      </main>

      {/* Footer - Si se proporciona */}
      {footer && (
        <footer className="flex-shrink-0 theme-footer theme-border-primary border-t relative z-40">
          {footer}
        </footer>
      )}
    </div>
  );
}
