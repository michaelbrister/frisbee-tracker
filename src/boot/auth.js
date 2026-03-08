// src/boot/auth.ts
import { boot } from 'quasar/wrappers'
import pb from 'src/services/pocketbase'

export default boot(async () => {
  try {
    if (pb.authStore.isValid) {
      await pb.collection('users').authRefresh()
    }
  } catch {
    pb.authStore.clear()
  }
})
