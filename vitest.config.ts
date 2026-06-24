import { defineConfig } from 'vitest/config'
import path from 'path'

// Isolated test config so the production vite.config stays focused on the build.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
