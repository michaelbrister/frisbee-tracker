<template>
  <q-btn
    flat
    round
    dense
    :icon="isDark ? 'dark_mode' : 'light_mode'"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <q-tooltip>{{ isDark ? 'Dark mode' : 'Light mode' }}</q-tooltip>
  </q-btn>
</template>

<script setup>
import { useThemeState } from 'src/services/themeService'

const { isDark, toggleTheme } = useThemeState()
</script>
