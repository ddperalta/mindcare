import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Firebase into separate chunks
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-functions': ['firebase/functions'],
          // Split i18n
          'i18n': ['react-i18next', 'i18next'],
          // Split React Router
          'router': ['react-router-dom'],
          // Vendor chunk for other dependencies
          'vendor': ['react', 'react-dom'],
        },
      },
    },
    // Increase chunk size warning limit to 1000 KB for better DX
    chunkSizeWarningLimit: 1000,
  },
})
