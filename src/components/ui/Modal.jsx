import React, { useState } from 'react';
import { CloseIcon } from '../Icons';

/**
 * Modal - Componente de modal reutilizable
 * Proporciona estructura de diálogo emergente con overlay
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  footer = null,
  closeButton = true,
  overlay = true
}) {
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
      <div className={`
        relative z-10 w-full ${sizeClass}
        theme-card theme-border-primary border rounded-lg shadow-2xl
        flex flex-col max-h-[90vh] overflow-hidden
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 theme-border-primary border-b">
          <h2 className="text-lg font-bold theme-text-primary">
            {title}
          </h2>
          {closeButton && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              aria-label="Close modal"
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
