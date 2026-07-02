import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  // Forward every /api request to the backend so the browser only ever
  // talks to the frontend origin (no CORS, no hardcoded backend URL).
  const proxy = {
    '/api': {
      target: backendUrl,
      changeOrigin: true,
    },
    // Uploaded files (avatars, …) live on the backend public disk.
    '/storage': {
      target: backendUrl,
      changeOrigin: true,
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0', // listen on all interfaces for external access
      port: 3000,
      proxy,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      proxy,
    },
  }
})
