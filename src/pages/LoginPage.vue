<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center">
        <q-card class="q-pa-md" style="min-width: 300px">
          <q-card-section>
            <div class="text-h6">Ultimate Frisbee League Login</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit.prevent="handleLogin">
              <q-input
                v-model="email"
                label="Email"
                type="email"
                outlined
                class="q-mb-md"
                @keyup.enter="handleLogin"
              />
              <q-input
                v-model="password"
                label="Password"
                type="password"
                outlined
                class="q-mb-md"
                @keyup.enter="handleLogin"
              />

              <q-card-actions align="right">
                <q-btn label="Login" color="primary" :loading="loading" type="submit">
                  <template v-slot:loading>
                    <q-spinner-facebook color="white" size="1em" />
                  </template>
                </q-btn>
              </q-card-actions>
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { Notify } from 'quasar'

const router = useRouter()
const { login, isLoggedIn } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (loading.value) return
  loading.value = true

  try {
    const success = await login(email.value, password.value)

    if (success && isLoggedIn()) {
      Notify.create({
        type: 'positive',
        message: 'Login successful! Redirecting...',
        position: 'top',
        timeout: 1500,
      })
      router.push({ name: 'league' })
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
</script>
