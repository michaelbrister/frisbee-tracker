import { ref } from 'vue'
import { Dark } from 'quasar'

const STORAGE_KEY = 'frisbee-theme'
const isDark = ref(false)

function applyTheme(nextIsDark) {
  Dark.set(!!nextIsDark)
  isDark.value = !!Dark.isActive
}

export function initTheme() {
  const saved =
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) || 'auto' : 'auto'

  if (saved === 'dark') applyTheme(true)
  else if (saved === 'light') applyTheme(false)
  else applyTheme(Dark.isActive)
}

export function toggleTheme() {
  const next = !Dark.isActive
  applyTheme(next)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
  }
}

export function useThemeState() {
  return { isDark, toggleTheme }
}
