import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache l'app shell + les requêtes API Supabase (lecture) pour usage hors-ligne
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sphinxfleet-api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'SphinxFleet',
        short_name: 'SphinxFleet',
        description: 'Gestion de parc automobile - Entreprises & ONG',
        theme_color: '#1a1d23',
        background_color: '#1a1d23',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
