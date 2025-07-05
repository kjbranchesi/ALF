import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Import the 'path' module

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // V9.2: Add a resolve alias to make imports more robust
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
