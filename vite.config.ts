/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app under /Routine/.
export default defineConfig({
  base: '/Routine/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The page shows "Yeni sürüm hazır · Yenile" and activates the worker on demand.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Routine',
        short_name: 'Routine',
        lang: 'tr',
        display: 'standalone',
        background_color: '#0B0D12',
        theme_color: '#0B0D12',
        start_url: '/Routine/',
        scope: '/Routine/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/Routine/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
})
