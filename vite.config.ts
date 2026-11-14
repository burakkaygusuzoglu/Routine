/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app under /Routine/.
// Content Security Policy for the production build only (dev needs inline
// scripts for hot reload). Network access is limited to this site and the
// Dexie Cloud sync service.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.dexie.cloud wss://*.dexie.cloud; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"

const securityHeaders: Plugin = {
  name: 'routine-security-meta',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`,
    )
  },
}

export default defineConfig({
  base: '/Routine/',
  plugins: [securityHeaders, 
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
