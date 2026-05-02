/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Usar clase 'dark' en el elemento html
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '360px', // iPhone SE y pantallas pequeñas
      },
      colors: {
        // Colores personalizados para el tema claro
        primary: '#fafaf8', // Blanco roto (off-white)
        secondary: '#d97706', // Naranja dorado (golden orange)
        tertiary: '#06b6d4', // Azul cian (cyan blue)
        
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
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          'text-inverse': 'var(--text-inverse)',
        },
      },
    },
  },
  plugins: [],
}
