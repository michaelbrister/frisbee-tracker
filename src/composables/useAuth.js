// src/composables/useAuth.js
import PocketBase from 'pocketbase'
import { ref } from 'vue'

const pb = new PocketBase('http://127.0.0.1:8090')
const currentUser = ref(pb.authStore.model)

pb.authStore.onChange(() => {
  currentUser.value = pb.authStore.model
})

export function useAuth() {
  async function login(email, password) {
    try {
      await pb.collection('users').authWithPassword(email, password)
      currentUser.value = pb.authStore.model
      return true
    } catch (err) {
      console.error('PocketBase login failed:', err)
      return false
    }
  }

  function logout() {
    pb.authStore.clear()
    currentUser.value = null
  }

  function isLoggedIn() {
    return pb.authStore.isValid
  }

  return { login, logout, isLoggedIn, currentUser }
}
