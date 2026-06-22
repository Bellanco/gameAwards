/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
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
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        }
      }
    }
  }
})
