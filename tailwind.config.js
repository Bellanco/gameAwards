/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Usar clase 'dark' en el elemento html
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'Times New Roman', 'serif'],
        body: ['Source Sans 3', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      screens: {
        'xs': '360px', // iPhone SE y pantallas pequeñas
        // OJO: el breakpoint por ALTURA (`short:`) NO puede vivir aquí.
        // Tailwind 4 lee este archivo por compatibilidad (`@config`), pero
        // traduce `{ raw: '(max-height: 500px)' }` a `@media (width >= (max-height:
        // 500px))`, que es CSS inválido y revienta la minificación. En v4 se
        // declara como variante en `src/index.css` (@custom-variant short).
      },
      // `h-screen` y `min-h-screen` pasan a usar unidades DINÁMICAS de viewport.
      //
      // 100vh en iOS Safari y Chrome Android incluye la barra de direcciones, así
      // que el layout header/main/footer de VoteScreen dejaba la fila de botones
      // parcialmente debajo de ella, y en CategoryManager (con overflow-hidden)
      // el contenido inferior era directamente inalcanzable.
      //
      // Se redefine aquí, en un solo sitio, en vez de tocar los ~15 usos. Si
      // alguna vez hace falta el vh estático, sigue disponible como `h-[100vh]`.
      // Soporte: Safari 15.4+, Chrome 108+, Firefox 101+ (>96% de navegadores).
      height: {
        screen: '100dvh',
      },
      minHeight: {
        screen: '100dvh',
      },
      colors: {
        // Colores base inspirados en pergamino y acero
        primary: '#efe5d3',
        secondary: '#7d5a2b',
        tertiary: '#4c9cb6',
        
        // Colores de accesibilidad WCAG 2.1 AA (contraste 4.5:1+)
        'accent': {
          light: '#b45309', // Amber-700 para tema claro
          dark: '#fbbf24', // Amber-300 para tema oscuro
          DEFAULT: 'var(--color-accent)',
        },
        
        // Estados con contraste garantizado
        'status': {
          'success': {
            light: '#15803d', // Green-700 (7.2:1)
            dark: '#4ade80', // Green-400 (6.2:1)
            DEFAULT: 'var(--color-success)',
          },
          'error': {
            light: '#dc2626', // Red-600 (7.5:1)
            dark: '#ff7675', // Red-500 (6.8:1)
            DEFAULT: 'var(--color-error)',
          },
          'warning': {
            light: '#c2410c', // Orange-700 (8.1:1)
            dark: '#fb923c', // Orange-400 (6.5:1)
            DEFAULT: 'var(--color-warning)',
          },
          'info': {
            light: '#1e40af', // Blue-800 (8.8:1)
            dark: '#38bdf8', // Cyan-400 (6.9:1)
            DEFAULT: 'var(--color-info)',
          },
        },
        
        // Variables CSS temáticas
        'theme': {
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-tertiary': 'var(--bg-tertiary)',
          'bg-unvoted': 'var(--bg-unvoted)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          'text-inverse': 'var(--text-inverse)',
          'border-primary': 'var(--border-primary)',
          'border-secondary': 'var(--border-secondary)',
        },
      },
      boxShadow: {
        themeSm: 'var(--shadow-sm)',
        themeMd: 'var(--shadow-md)',
        themeLg: 'var(--shadow-lg)',
      },
      keyframes: {
        themeFadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        emberFlicker: {
          '0%, 100%': { opacity: '0.92', filter: 'saturate(1)' },
          '50%': { opacity: '1', filter: 'saturate(1.15)' },
        },
        metalShine: {
          '0%': { backgroundPosition: '0% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'theme-fade-in': 'themeFadeInUp 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        'ember-flicker': 'emberFlicker 2.8s ease-in-out infinite',
        'metal-shine': 'metalShine 2.6s linear infinite',
      },
    },
  },
  plugins: [],
}
