import axios from 'axios'

// Axios instance pointing at the CI4 backend.
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

// Attach the JWT on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global error handling: normalize errors and handle 401s.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/vendor-login'
    }
    return Promise.reject(error)
  }
)

/**
 * Normalize an axios error into a readable message object.
 */
export function extractError(error) {
  const res = error?.response?.data
  if (res?.message) {
    return { message: res.message, errors: res.data }
  }
  if (error?.message) {
    return { message: error.message, errors: null }
  }
  return { message: 'An unexpected error occurred.', errors: null }
}

export default api
