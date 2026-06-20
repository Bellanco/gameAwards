import React, { useEffect, useRef } from 'react';
import { CloseIcon } from '../Icons';

/**
 * Modal - Componente de modal reutilizable
 * Proporciona estructura de diálogo emergente con overlay.
 *
 * Accesibilidad: usa role="dialog" + aria-modal, mueve el foco al diálogo al
 * abrirse y se cierra con la tecla Escape.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  footer = null,
  closeButton = true,
  overlay = true,
  closeLabel = 'Close'
}) {
  const dialogRef = useRef(null);

  // Cerrar con Escape mientras el modal esté abierto.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mover el foco al diálogo al abrirse (lectores de pantalla / teclado).
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl'
  }[size] || 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay - Si está habilitado */}
      {overlay && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        className={`
        relative z-10 w-full ${sizeClass}
        theme-card theme-border-primary border rounded-lg shadow-2xl
        flex flex-col max-h-[90vh] overflow-hidden focus:outline-none
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 theme-border-primary border-b">
          <h2 id="modal-title" className="text-lg font-bold theme-text-primary">
            {title}
          </h2>
          {closeButton && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              aria-label={closeLabel}
            >
              <CloseIcon className="w-5 h-5 theme-text-secondary" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4 theme-text-primary">
          {children}
        </div>

        {/* Footer - Si se proporciona */}
        {footer && (
          <div className="px-6 py-4 theme-border-primary border-t flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
