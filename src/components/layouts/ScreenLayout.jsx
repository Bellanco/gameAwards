import React from 'react';
import ControlBar from './ControlBar';

/**
 * ScreenLayout - Componente layout reutilizable para pantallas
 * Proporciona estructura: ControlBar + Header + Content + Footer
 * 
 * @component
 * @param {React.ReactNode} children - Contenido principal
 * @param {React.ReactNode} header - Componente de encabezado (opcional)
 * @param {React.ReactNode} footer - Componente de pie (opcional)
 * @param {string} backgroundImage - URL de imagen de fondo para header (opcional)
 * @param {boolean} showControlBar - Mostrar barra de controles (default: true)
 * @param {string} containerClass - Clases personalizadas para contenedor principal
 * @returns {React.ReactElement}
 */
export default function ScreenLayout({
  children,
  header = null,
  footer = null,
  backgroundImage = null,
  showControlBar = true,
  containerClass = 'min-h-screen theme-gradient-primary flex flex-col'
}) {
  return (
    <div className={`${containerClass} relative overflow-hidden`}>
      {/* Atmósfera global reutilizable */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-status-warning-light blur-3xl opacity-75" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-status-info-light blur-3xl opacity-70" />
      </div>

      {/* Control Bar - Idioma y Tema */}
      {showControlBar && <ControlBar />}

      {/* Header - Si se proporciona */}
      {header && (
        <header className="shrink-0 theme-header theme-border-primary border-b relative z-40">
          {backgroundImage && (
            <div className="absolute inset-0 overflow-hidden opacity-30">
              <img
                src={backgroundImage}
                alt="header background"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
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
        <footer className="shrink-0 theme-footer theme-border-primary border-t relative z-40">
          {footer}
        </footer>
      )}
    </div>
  );
}
