import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The API address the dev server forwards /api calls to. Forwarding keeps
// the browser on one origin, so the API needs no CORS configuration.
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': API_TARGET },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
