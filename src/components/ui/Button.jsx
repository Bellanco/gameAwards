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
    primary: 'theme-btn-primary theme-text-inverse',
    secondary: 'theme-btn-secondary border theme-text-primary',
    success: 'btn-success border theme-border-primary',
    danger: 'btn-danger border theme-border-primary',
    outline: 'bg-transparent border theme-border-secondary theme-text-primary hover:bg-[var(--bg-secondary)]'
  };

  // Tamaños
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const baseClasses = 'font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]';
  const widthClass = fullWidth ? 'w-full' : '';
  const stateClass = loading ? 'opacity-75 cursor-wait' : 'hover:-translate-y-0.5';

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
      {children}
    </button>
  );
}
