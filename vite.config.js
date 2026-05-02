import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
    }
  }
})
