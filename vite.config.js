import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Tailwind 4 entra como plugin de Vite, no por PostCSS: es la vía recomendada
  // en v4, evita el aviso «PostCSS plugin did not pass the `from` option» y deja
  // el proyecto sin postcss.config.js.
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Los tests de reglas necesitan el emulador de Firestore: viven aparte, en
    // vitest.rules.config.js (`npm run test:rules`).
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.rules.test.js'],
  },
  define: {
    // Asegurar que import.meta.env.PROD sea true en producción
    __DEV__: JSON.stringify(true)
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Minimizar en producción (elimina comentarios y espacios en blanco)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Elimina console.log() en producción
      }
    },
    rollupOptions: {
      output: {
        // Separar Firebase (~la mayor parte del bundle) en su propio chunk
        // para mejorar el cacheo y el TTI del bundle principal.
        //
        // Va como FUNCIÓN, no como objeto: desde Vite 8 el bundler es Rolldown y
        // solo acepta esta forma ("manualChunks is not a function"). Agrupar por
        // ruta del módulo cubre además las dependencias internas de Firebase
        // (@firebase/*), que con la forma antigua caían en el chunk principal.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          return null;
        },
      }
    }
  }
})
