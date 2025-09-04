// import { createApp } from 'vue'
// import App from './App.vue'
// import router from './router'
// import { Quasar } from 'quasar'
// import quasarUserOptions from './quasar-user-options'

// createApp(App).use(Quasar, quasarUserOptions).use(router).mount('#app')

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { Quasar } from 'quasar'
import quasarUserOptions from './quasar-user-options'
import { createPinia } from 'pinia' // Import createPinia

// Create the Pinia instance before creating the Vue app.
const pinia = createPinia()

const app = createApp(App)

// Use Pinia on the app instance right after it's created.
// This is the most crucial step to ensure it's available everywhere.
app.use(pinia)

app.use(Quasar, quasarUserOptions)
app.use(router)

app.mount('#app')
