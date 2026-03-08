<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center">
        <q-card class="q-pa-md" style="width: min(420px, 94vw)">
          <q-card-section>
            <div class="row items-center">
              <div class="text-h6">Ultimate Frisbee League Login</div>
              <q-space />
              <ThemeToggle />
            </div>
          </q-card-section>

          <q-card-section>
            <q-input
              v-model="email"
              label="Email"
              type="email"
              outlined
              class="q-mb-sm"
              inputmode="email"
              autocomplete="username email"
              autocapitalize="none"
              autocorrect="off"
              autofocus
            />

            <template v-if="otpEnabled">
              <q-btn
                color="primary"
                icon="mail"
                class="full-width"
                label="Email me a sign-in link"
                :loading="otpLoading"
                :disable="loading || resetLoading || otpLoading || !email"
                @click="requestOtp"
              />
              <div class="text-caption text-grey-7 q-mt-xs">
                Fastest option on mobile. Tap the link in your email to sign in.
              </div>
              <q-separator spaced />
            </template>

            <q-expansion-item
              v-model="showPasswordLogin"
              dense
              icon="key"
              label="Use password instead"
              switch-toggle-side
              class="rounded-borders"
            >
              <q-form class="q-pt-sm" @submit.prevent="handleLogin">
                <q-input
                  v-model="password"
                  :type="showPwd ? 'text' : 'password'"
                  label="Password"
                  outlined
                  class="q-mb-md"
                  @keyup.enter="handleLogin"
                  autocomplete="current-password"
                >
                  <template #append>
                    <q-icon
                      :name="showPwd ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showPwd = !showPwd"
                    />
                  </template>
                </q-input>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-6">
                    <q-btn
                      flat
                      color="secondary"
                      class="full-width"
                      label="Forgot Password"
                      :loading="resetLoading"
                      :disable="loading || resetLoading || !email"
                      @click="requestPasswordReset"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-btn
                      label="Login with Password"
                      color="primary"
                      class="full-width"
                      :loading="loading"
                      :disable="loading || resetLoading || otpLoading || !email || !password"
                      type="submit"
                    >
                      <template v-slot:loading>
                        <q-spinner-facebook color="white" size="1em" />
                      </template>
                    </q-btn>
                  </div>
                </div>
              </q-form>
            </q-expansion-item>

            <div class="text-caption text-grey-7 q-mt-sm">
              Keep it simple for new players: use email link first, password only as backup.
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { Notify } from 'quasar'
import pb from 'src/services/pocketbase'
import ThemeToggle from 'src/components/ThemeToggle.vue'

const router = useRouter()
const route = useRoute()
const { login, isLoggedIn } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const otpLoading = ref(false)
const resetLoading = ref(false)
const showPwd = ref(false)
const AUTH_COLLECTION = 'users'
const otpEnabled = import.meta.env.VITE_ENABLE_OTP === 'true'
const showPasswordLogin = ref(!otpEnabled)

function redirectTarget() {
  const q = route.query?.redirect
  // default to league if nothing provided
  return typeof q === 'string' && q ? q : { name: 'league' }
}

onMounted(() => {
  try {
    if (isLoggedIn && typeof isLoggedIn === 'function' && isLoggedIn()) {
      router.replace(redirectTarget())
    }
  } catch (err) {
    console.error('Silent login failed:', err)
  }
})

async function handleLogin() {
  if (loading.value) return
  loading.value = true

  if (!/.+@.+\..+/.test(email.value)) {
    Notify.create({ type: 'warning', message: 'Please enter a valid email address.' })
    loading.value = false
    return
  }

  try {
    const success = await login(email.value, password.value)

    if (success && isLoggedIn()) {
      Notify.create({
        type: 'positive',
        message: 'Login successful! Redirecting...',
        position: 'top',
        timeout: 1500,
      })
      router.replace(redirectTarget())
    } else {
      Notify.create({
        type: 'negative',
        message: 'Invalid email or password. Please try again.',
        position: 'top',
      })
    }
  } catch (err) {
    console.error(err)
    Notify.create({
      type: 'negative',
      message: 'An error occurred while logging in.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

async function requestOtp() {
  if (!otpEnabled) {
    Notify.create({ type: 'warning', message: 'One-time sign-in links are currently disabled.' })
    return
  }
  if (!email.value || !/.+@.+\..+/.test(email.value)) {
    Notify.create({ type: 'warning', message: 'Enter a valid email first.' })
    return
  }
  if (otpLoading.value) return
  otpLoading.value = true
  try {
    await pb.send(`/api/collections/${AUTH_COLLECTION}/request-otp`, {
      method: 'POST',
      body: { email: email.value },
      $autoCancel: false,
    })
    Notify.create({ type: 'positive', message: 'Check your email for a one-time sign-in link.' })
  } catch (e) {
    console.error('OTP request failed:', e)
    Notify.create({ type: 'negative', message: 'Could not send link. Try again in a moment.' })
  } finally {
    otpLoading.value = false
  }
}

async function requestPasswordReset() {
  if (!email.value || !/.+@.+\..+/.test(email.value)) {
    Notify.create({ type: 'warning', message: 'Enter a valid email first.' })
    return
  }
  if (resetLoading.value) return
  resetLoading.value = true
  try {
    await pb.collection(AUTH_COLLECTION).requestPasswordReset(email.value)
    Notify.create({
      type: 'positive',
      message: 'Password reset email sent. Check your inbox and spam folder.',
      timeout: 3500,
    })
  } catch (err) {
    console.error('Password reset request failed:', err)
    Notify.create({
      type: 'negative',
      message: 'Could not send password reset email right now.',
    })
  } finally {
    resetLoading.value = false
  }
}
</script>
