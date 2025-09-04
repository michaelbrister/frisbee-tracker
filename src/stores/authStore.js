import { reactive } from 'vue'

export const authStore = reactive({
  token: localStorage.getItem('auth_token') || null,
  user: null,

  setToken(newToken) {
    this.token = newToken
    if (newToken) localStorage.setItem('auth_token', newToken)
    else localStorage.removeItem('auth_token')
  },

  isLoggedIn() {
    return !!this.token
  },
})
