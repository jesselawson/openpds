import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(),vueDevTools()],
  base: '/openpds/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
