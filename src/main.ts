import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { initDB } from './db'

let initialized = false

async function init() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  
  await initDB()

  const authStore = useAuthStore(pinia)
  await authStore.init()
  
  app.use(router)
  initialized = true

  app.mount('#app')
}

init().catch((error) => {
  console.error('Failed to initialize app:', error)
  document.body.innerHTML = 'Failed to load application. Please refresh.'
})

export function isInitialized() {
  return initialized
}