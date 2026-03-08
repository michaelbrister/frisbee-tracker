import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { Quasar } from 'quasar'
import quasarUserOptions from './quasar-user-options'
import { createPinia } from 'pinia'
import { initTheme } from 'src/services/themeService'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(Quasar, quasarUserOptions)
initTheme()
app.use(router)
app.mount('#app')
