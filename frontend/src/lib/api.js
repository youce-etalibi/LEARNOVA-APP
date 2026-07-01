import axios from 'axios'
import { useAuthStore } from '../store/auth'

const baseURL = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api`

const api = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
})

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, try a single silent refresh; otherwise log out.
let refreshing = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const store = useAuthStore.getState()

    const isAuthCall =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh')

    if (status === 401 && store.token && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        refreshing =
          refreshing ||
          api.post('/auth/refresh').then((r) => {
            store.setToken(r.data.access_token)
            return r.data.access_token
          })
        const newToken = await refreshing
        refreshing = null
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        refreshing = null
        store.logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default api
