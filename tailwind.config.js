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
      },
    },
  },
  plugins: [],
}
