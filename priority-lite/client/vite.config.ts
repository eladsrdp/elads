/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // בפיתוח: Vite מגיש את הקליינט וכל /api עובר לשרת ה-Hono
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    globals: true,
  },
})
