import React, { useRef, useEffect, useState } from 'react';

/**
 * AutoSizeText - Componente que redimensiona automáticamente el texto
 * Similar a Android's autoSizeTextType="uniform"
 * 
 * @param {string} children - Texto a mostrar
 * @param {number} minSize - Tamaño mínimo en px (por defecto 12px)
 * @param {number} maxSize - Tamaño máximo en px (por defecto 28px)
 * @param {number} stepGranularity - Granularidad del ajuste en px (por defecto 1px)
 * @param {string} className - Clases adicionales de Tailwind
 */
export default function AutoSizeText({
  children,
  minSize = 12,
  maxSize = 28,
  stepGranularity = 1,
  className = 'block font-bold text-white text-center break-words leading-tight'
}) {
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(maxSize);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let currentSize = maxSize;

    // Reduce el tamaño hasta que el contenido quepa
    while (currentSize >= minSize) {
      element.style.fontSize = `${currentSize}px`;

      // Verifica si el contenido cabe dentro del contenedor
      // Añade pequeño buffer (2px) para evitar overflow por redondeos
      if (
        element.scrollHeight <= element.clientHeight + 2 &&
        element.scrollWidth <= element.clientWidth + 2
      ) {
        setFontSize(currentSize);
        return;
      }

      currentSize -= stepGranularity;
    }

    // Si ni siquiera el tamaño mínimo cabe, usa el mínimo
    element.style.fontSize = `${minSize}px`;
    setFontSize(minSize);
  }, [children, minSize, maxSize, stepGranularity]);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        fontSize: `${fontSize}px`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%'
      }}
    >
      {children}
    </span>
  );
}
