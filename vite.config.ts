/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the app under /Routine/.
export default defineConfig({
  base: '/Routine/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
})
