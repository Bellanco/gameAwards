/**
 * Componente Button - Botón reutilizable con múltiples variantes
 * 
 * @typedef {'primary'|'secondary'|'success'|'danger'|'outline'} ButtonVariant
 * @typedef {'sm'|'md'|'lg'} ButtonSize
 * @typedef {Object} ButtonProps
 * @property {React.ReactNode} children - Contenido del botón
 * @property {ButtonVariant} [variant='primary'] - Estilo del botón
 * @property {ButtonSize} [size='md'] - Tamaño del botón
 * @property {boolean} [fullWidth=false] - Ancho completo
 * @property {boolean} [loading=false] - Estado de carga
 * @property {boolean} [disabled=false] - Deshabilitado
 * @property {string} [className] - Clases Tailwind adicionales
 * @property {Function} [onClick] - Callback de click
 * @property {string} [type='button'] - Tipo de botón
 * 
 * @param {ButtonProps} props
 * @returns {React.ReactElement}
 * 
 * Uso: <Button variant="primary" size="md">Enviar</Button>
 */

import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'success', 'danger'
  size = 'md', // 'sm', 'md', 'lg'
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  className = '',
  ...props
}) {
  // Variantes de color
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-100'
  };

  // Tamaños
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const baseClasses = 'font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const widthClass = fullWidth ? 'w-full' : '';
  const stateClass = loading ? 'opacity-75 cursor-wait' : '';

  const combinedClass = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClass}
    ${stateClass}
    ${className}
  `;

  return (
    <button
      className={combinedClass}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? '⏳ ' : ''}{children}
    </button>
  );
}
