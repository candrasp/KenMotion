import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5757,
    proxy: {
      '/projects': { target: 'http://127.0.0.1:3031', changeOrigin: true },
      '/check':    { target: 'http://127.0.0.1:3031', changeOrigin: true },
      '/render':   { target: 'http://127.0.0.1:3031', changeOrigin: true },
      '/audio':    { target: 'http://127.0.0.1:3031', changeOrigin: true },
      '/library':  { target: 'http://127.0.0.1:3031', changeOrigin: true },
      '/fixes':    { target: 'http://127.0.0.1:3031', changeOrigin: true },
      '/chat': {
        target: 'http://127.0.0.1:3031',
        changeOrigin: true,
      },
      '/health':   { target: 'http://127.0.0.1:3031', changeOrigin: true },
    },
  },
})
