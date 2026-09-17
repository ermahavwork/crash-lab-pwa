import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Официальный генератор иконок vite-pwa: из одного SVG делает весь набор
// (64/192/512, maskable 512, apple-touch 180, favicon).
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background: '#0b0f1a' } },
    apple: { sizes: [180], padding: 0.3, resizeOptions: { background: '#0b0f1a' } },
  },
  images: ['public/logo.svg'],
})
