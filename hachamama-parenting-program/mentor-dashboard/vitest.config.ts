import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    include: ['src/lib/**/*.test.ts', 'src/engine/**/*.test.ts', 'src/app/**/*.test.ts'],
  },
})
