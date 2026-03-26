import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/search': 'http://localhost:8000',
      '/verify': 'http://localhost:8000',
      '/outline': 'http://localhost:8000'
    }
  }
})
