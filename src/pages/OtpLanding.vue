<template>
  <q-page class="flex flex-center">
    <q-spinner size="2em" />
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import pb from 'src/services/pocketbase'
import { Notify } from 'quasar'

const router = useRouter()
const route = useRoute()

function redirectTarget() {
  const q = route.query?.redirect
  return typeof q === 'string' && q ? q : { name: 'league' }
}

onMounted(async () => {
  const otpId = route.query.otpId
  const otp = route.query.otp
  if (!otpId || !otp) {
    Notify.create({ type: 'negative', message: 'Invalid magic link.' })
    router.replace({ name: 'login' })
    return
  }
  try {
    await pb.collection('users').authWithOTP({ otpId, otp })
    // (Optional) refresh to extend session
    await pb
      .collection('users')
      .authRefresh()
      .catch(() => {})
    router.replace(redirectTarget())
  } catch (e) {
    console.error('OTP auth failed:', e)
    Notify.create({ type: 'negative', message: 'Magic link expired or invalid.' })
    router.replace({ name: 'login', query: { redirect: redirectTarget() } })
  }
})
</script>
