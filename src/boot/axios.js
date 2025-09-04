import axios from 'axios'

axios.defaults.baseURL = 'https://api.example.com/'

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
