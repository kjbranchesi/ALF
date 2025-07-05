import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// V9.3 - Removing alias configuration for maximum deploy compatibility.
export default defineConfig({
  plugins: [react()],
})
