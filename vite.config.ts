import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Приложение отдаётся с сервера под префиксом /pwa/ (Tailscale Funnel → 127.0.0.1:8180).
// Для локальной проверки: VITE_BASE=/ pnpm build
const base = process.env.VITE_BASE ?? '/pwa/'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', sourcemap: false },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
      manifest: {
        id: '/pwa/',
        name: 'Crash Lab — демо crash-игры',
        short_name: 'Crash Lab',
        description: 'Учебное PWA: crash-игра на виртуальных кредитах с provably-fair проверкой раундов.',
        lang: 'ru',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0f1a',
        theme_color: '#0b0f1a',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Играть', url: `${base}#/crash`, icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'История', url: `${base}#/history` },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
