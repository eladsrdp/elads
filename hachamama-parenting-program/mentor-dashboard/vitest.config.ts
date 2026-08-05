import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts', 'src/engine/**/*.test.ts', 'src/app/**/*.test.ts'],
  },
})
