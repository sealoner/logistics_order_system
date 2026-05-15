import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  //  // 👇 修复 Vite 8 + echarts 所有报错（核心）
  // optimizeDeps: {
  //   exclude: ['echarts-for-react', 'echarts', 'tslib'],
  // },

  // resolve: {
  //   alias: {
  //     '@': path.resolve(__dirname, './src'),
  //   },
  // },
})