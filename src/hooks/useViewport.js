/**
 * Hook custom: useViewport
 *
 * Ancho del viewport y si estamos en móvil / apaisado.
 *
 * Existía duplicado dentro de VoteScreen, con dos listeners de `resize` sin
 * agrupar: durante un giro de pantalla se disparaban decenas de `setState`
 * seguidos. Aquí hay UN listener y los eventos se agrupan con
 * `requestAnimationFrame`, así que un giro produce una sola actualización.
 */

import { useState, useEffect } from 'react';

/** Por debajo de este ancho se considera móvil (coincide con `md:` de Tailwind). */
const MOBILE_BREAKPOINT = 768;

const readViewport = () => {
  if (typeof window === 'undefined') {
    return { width: 0, isMobile: false, isLandscape: false };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    isMobile: width < MOBILE_BREAKPOINT,
    isLandscape: width > height,
  };
};

/**
 * @returns {{width: number, isMobile: boolean, isLandscape: boolean}}
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    let frame = null;

    const update = () => {
      if (frame !== null) return; // ya hay una actualización en cola
      frame = requestAnimationFrame(() => {
        frame = null;
        setViewport(readViewport());
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return viewport;
};
