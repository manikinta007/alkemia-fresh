import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Portal Siswa - AlkeMia',
        short_name: 'AlkeMia',
        description: 'AlkeMia Learning System Student Portal',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/student',
        scope: '/student',
        icons: [
          {
            src: 'https://iili.io/f4HD692.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://iili.io/f4HD692.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // Wrangler default dev port
        changeOrigin: true,
      }
    }
  }
})
