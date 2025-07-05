import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// This is the robust way to get the directory name in modern JavaScript.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This now creates a permanent, unbreakable alias for the src folder.
      '@': path.resolve(__dirname, './src'),
    },
  },
})
