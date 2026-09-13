/**
 * Iconos de la interfaz, todos SVG. NO se usan emojis: cada sistema los dibuja
 * a su manera (y algunos ni los tienen), así que la misma pantalla salía
 * distinta en cada dispositivo y no se podían teñir con el color del tema.
 *
 * COLOR: la mayoría heredan `currentColor`, así que se pintan con el color del
 * texto que los rodea y funcionan en tema claro y oscuro sin tocar nada. Solo
 * llevan color propio los que lo NECESITAN para significar algo: las medallas,
 * donde el oro, la plata y el bronce SON la información.
 */

export function TrophyIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      {/* Asas, copa y pie: el conjunto se lee incluso a 16 px. */}
      <path d="M5 4H2.6v2.2A4.4 4.4 0 0 0 6.4 10.6l.5-2A2.4 2.4 0 0 1 4.6 6.2V6H5zM19 4h2.4v2.2a4.4 4.4 0 0 1-3.8 4.4l-.5-2a2.4 2.4 0 0 0 2.3-2.4V6H19z" opacity="0.75" />
      <path d="M6 2.6h12v6.1a6 6 0 0 1-12 0z" />
      <path d="M11 14.4h2v3.4h-2zM7.6 19.2h8.8v2.2H7.6z" />
    </svg>
  );
}

/**
 * Metales del podio. Cada uno lleva el aro (borde), la cara (relleno), el
 * brillo y la tinta del número, para que el disco se lea como una medalla y no
 * como un círculo de color plano.
 */
const MEDAL_TONES = {
  1: { rim: '#a9801a', face: '#e8c24d', shine: '#fbeaa8', ink: '#463405', ribbon: '#b4472f' },
  2: { rim: '#79848d', face: '#c3ccd3', shine: '#eef2f5', ink: '#333a40', ribbon: '#4a6076' },
  3: { rim: '#845024', face: '#c8834a', shine: '#e7b184', ink: '#3d210c', ribbon: '#5d5340' },
};

/**
 * Medalla del podio con el número del puesto.
 *
 * Los tres primeros puestos llevan su metal; del cuarto en adelante, un disco
 * neutro con el color del tema. Esa diferencia no es decorativa: distingue a
 * quien sube al podio de quien entra en los premios sin medalla.
 *
 * @param {Object} props
 * @param {number} props.rank - puesto (denso)
 * @param {string} [props.className]
 */
export function MedalIcon({ rank, className = "w-7 h-7" }) {
  const tone = MEDAL_TONES[rank];

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      {/* Cintas: se cruzan por detrás del disco. */}
      <path
        d="M7.6 1.5 4.9 3l3 6.2 3.4-2.1z"
        fill={tone ? tone.ribbon : 'currentColor'}
        opacity={tone ? 1 : 0.35}
      />
      <path
        d="M16.4 1.5 19.1 3l-3 6.2-3.4-2.1z"
        fill={tone ? tone.ribbon : 'currentColor'}
        opacity={tone ? 0.75 : 0.25}
      />
      <circle cx="12" cy="15.4" r="7.1" fill={tone ? tone.rim : 'currentColor'} />
      <circle cx="12" cy="15.4" r="5.5" fill={tone ? tone.face : 'currentColor'} opacity={tone ? 1 : 0.25} />
      {/* Un destello arriba a la izquierda: sin él el disco parece plano. */}
      {tone && <path d="M8.4 12.6a5 5 0 0 1 3.3-1.6 5.5 5.5 0 0 0-4 4 5 5 0 0 1 .7-2.4z" fill={tone.shine} />}
      <text
        x="12"
        y="15.9"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="7"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill={tone ? tone.ink : 'currentColor'}
      >
        {rank}
      </text>
    </svg>
  );
}

export function CheckmarkIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LanguageIcon({ className = "w-5 h-5" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function StarIcon({ className = "w-5 h-5" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function MenuIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ className = "w-5 h-5" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ThemeIcon({ className = "w-5 h-5", isDark = false }) {
  if (isDark) {
    // Moon icon for dark mode
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Sun icon for light mode
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Aviso. Lleva color propio —el ámbar de advertencia— porque es su único
 * trabajo: avisar antes de que se lea el texto.
 */
export function WarningIcon({ className = "w-12 h-12" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.2 22 20.4H2z"
        fill="var(--color-warning)"
        opacity="0.22"
        stroke="var(--color-warning)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.4v4.4"
        stroke="var(--color-warning)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1.15" fill="var(--color-warning)" />
    </svg>
  );
}

/**
 * Candado cerrado: la votación terminó. Antes aquí había una equis roja, que
 * se lee como «algo ha fallado» y no como «el plazo se acabó».
 */
export function LockIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
      <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" strokeLinecap="round" />
      <circle cx="12" cy="15.6" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Reloj: la edición existe, pero su hora todavía no ha llegado. */
export function ClockIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.4l3.4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Confirmación: el disco en verde de éxito con su marca dentro. Lleva color
 * propio porque el verde ES el mensaje —salió bien— y se capta antes de leer.
 */
export function CheckCircleIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.2" fill="var(--color-success)" opacity="0.16" />
      <circle cx="12" cy="12" r="10.2" stroke="var(--color-success)" strokeWidth="1.6" />
      <path
        d="m7.6 12.3 3 3 5.8-6"
        stroke="var(--color-success)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Escudo con marca: el voto queda guardado y protegido. */
export function ShieldIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2.8 4.6 5.9v5.5c0 4.3 3 8.3 7.4 9.8 4.4-1.5 7.4-5.5 7.4-9.8V5.9z" strokeLinejoin="round" />
      <path d="m8.8 11.9 2.3 2.3 4.1-4.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Una persona: un voto por cabeza. */
export function UserIcon({ className = "w-6 h-6" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" strokeLinecap="round" />
    </svg>
  );
}
