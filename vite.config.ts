import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ] as any
    },
  },
  server: {
    watch: {
      usePolling: true, // Better file watching on some systems
    },
    hmr: {
      overlay: true,
    },
  },
  // Optimize dependencies to avoid re-bundling
  optimizeDeps: {
    force: false, // Don't force re-optimization every time
  },
})
