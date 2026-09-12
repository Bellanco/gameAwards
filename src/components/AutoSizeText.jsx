import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';

/**
 * AutoSizeText - Ajusta el tamaño de letra hasta que el texto cabe en su caja.
 * Equivalente al autoSizeTextType="uniform" de Android.
 *
 * @param {string} children - Texto a mostrar
 * @param {number} minSize - Tamaño mínimo en px
 * @param {number} maxSize - Tamaño máximo en px
 * @param {number} stepGranularity - Precisión del ajuste en px
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

  /**
   * Busca el mayor tamaño que cabe, por BISECCIÓN.
   *
   * Antes se bajaba de 1 en 1 desde maxSize, escribiendo el estilo y leyendo
   * `scrollHeight` en cada vuelta: eso es un reflow síncrono por iteración, hasta
   * 21 por tarjeta. Con 10 nominados en pantalla eran ~210 reflows en el hilo
   * principal cada vez que se cambiaba de categoría, y otros tantos en cada
   * resize. La bisección los deja en ~5 por tarjeta.
   *
   * La búsqueda es válida porque «cabe a tamaño S» es monótono: si cabe a un
   * tamaño, cabe a cualquiera menor.
   */
  const fitFontSize = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    // Se mide con un buffer de 2px para absorber redondeos del navegador.
    const fitsAt = (size) => {
      element.style.fontSize = `${size}px`;
      return (
        element.scrollHeight <= element.clientHeight + 2 &&
        element.scrollWidth <= element.clientWidth + 2
      );
    };

    // Atajo habitual: si cabe al tamaño máximo no hay nada que buscar.
    if (fitsAt(maxSize)) {
      setFontSize(maxSize);
      return;
    }

    let low = minSize;
    let high = maxSize;
    let best = minSize;

    while (high - low >= stepGranularity) {
      const mid = low + Math.floor((high - low) / (2 * stepGranularity)) * stepGranularity;
      if (mid === low) break;
      if (fitsAt(mid)) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    element.style.fontSize = `${best}px`;
    setFontSize(best);
  }, [minSize, maxSize, stepGranularity]);

  // useLayoutEffect: el ajuste ocurre ANTES de pintar, así no se ve el texto a
  // tamaño máximo un instante antes de encogerse.
  useLayoutEffect(() => {
    fitFontSize();
  }, [children, fitFontSize]);

  // Recalcular cuando cambia el tamaño del contenedor (rotar el móvil cambia el
  // número de columnas de la rejilla y, con él, el ancho de cada tarjeta). Sin
  // esto, el texto se quedaba desbordado hasta cambiar de categoría.
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    let frame = null;
    const observer = new ResizeObserver(() => {
      // Un rAF agrupa la ráfaga de eventos de un giro de pantalla en un solo
      // recálculo, y evita el bucle "resize -> cambio de estilo -> resize".
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        fitFontSize();
      });
    });

    observer.observe(element);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [fitFontSize]);

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
