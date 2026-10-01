import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// The Go api on the HTTP_PORT from the repo root .env, so one setting moves both.
const { HTTP_PORT = '8080' } = loadEnv('', path.resolve(import.meta.dirname, '..'), 'HTTP_PORT')
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? `http://localhost:${HTTP_PORT}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before the react plugin so route files are generated and
    // code-split before JSX is transformed.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // LINE reaches the dev server through a tunnel while trying the order form; see docs/LINE-SETUP.md.
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
    // Same-origin requests in development, so the api needs no CORS setup.
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/healthz': { target: apiTarget, changeOrigin: true },
    },
  },
})
