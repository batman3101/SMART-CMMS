import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 외부 접속 허용 (0.0.0.0)
    port: 5173,
  },
  build: {
    // iOS Safari 14+ 지원을 위한 빌드 타깃 설정
    target: ['es2020', 'safari14', 'chrome87', 'firefox78'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Buffer polyfill for ExcelJS
      buffer: 'buffer/',
    },
  },
  // ExcelJS requires Buffer polyfill for browser
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['exceljs', 'buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
})
