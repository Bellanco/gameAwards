/**
 * Componente Card - Contenedor versátil (Compound Component Pattern)
 * 
 * @typedef {Object} CardProps
 * @property {React.ReactNode} children - Contenido
 * @property {string} [className] - Clases Tailwind adicionales
 * 
 * @param {CardProps} props
 * @returns {React.ReactElement & {Header: React.ComponentType, Body: React.ComponentType, Footer: React.ComponentType}}
 * 
 * Uso: <Card><Card.Header>Title</Card.Header><Card.Body>Content</Card.Body></Card>
 */

import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`
        theme-card border rounded-lg
        hover:border-yellow-500/30 transition-all
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className = '' }) {
  return (
    <div className={`border-b theme-border-primary p-6 ${className}`}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`border-t theme-border-primary p-6 ${className}`}>
      {children}
    </div>
  );
};
