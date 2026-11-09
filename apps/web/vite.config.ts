import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'LangkahKu — Belajar SPLDV',
        short_name: 'LangkahKu',
        description: 'Belajar SPLDV langkah demi langkah dan literasi matematika.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#EEF4FB',
        theme_color: '#1F4E89',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/docs/],
        runtimeCaching: [
          {
            // Learning content works offline after it has been opened once (docs/07 §6)
            urlPattern: ({ url }) => /^\/api\/v1\/(modules|method-cards)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'content', expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
