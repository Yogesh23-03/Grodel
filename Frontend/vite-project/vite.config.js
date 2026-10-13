import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
       tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    // Source maps stay off in production: they'd ship readable source and add
    // weight to every deploy.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the libraries that change rarely into their own chunks so a
        // code change doesn't invalidate the whole cached bundle.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          ui: ['react-icons'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
