<script setup lang="ts">
// src/views/Login.vue

import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const handle = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const login = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await auth.login(handle.value, password.value)
    router.push(route.query.redirect?.toString() || '/')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="grid">
      <h1>Login</h1>
    </div>

    <div v-if="error" class="grid">
          {{ error }}
        </div>

    <form @submit.prevent="login" class="mt-8 space-y-6">
      <div class="grid">
        <div class="login-left">
          <p>Welcome to <span class="openpds">OpenPDS</span>!</p>
          <ul>
            <li>If you haven't done so already, <a href="https://bsky.app/settings/app-passwords">create an app password</a> to use with this application.</li>
            <li><strong>DO NOT</strong> use your normal password; create a <em>new</em> app password to use specifically and only for this site.</li>
          </ul>
          <p>Questions? Comments? Ideas?</p>
          <ul>
            <li>Bsky: <a href="https://bsky.app/profile/jesse.lawsonry.com">@jesse.lawsonry.com</a></li>
            <li>GitHub: <a href="https://github.com/jesselawson/openpds">github.com/jesselawson/openpds</a></li>
          </ul>
          
        </div>
        <div class="width-auto">
          <div class="formgroup">
            <label for="handle">
              Handle
            </label><br/>
            <input
              id="handle"
              v-model="handle"
              type="text"
              required
              
            />
          </div>
          <div class="formgroup">
            <label for="password" >
              Password
            </label><br/>
         
            <input
              id="password"
              v-model="password"
              type="password"
              required
              
            />
          </div>
          <br/>

          <div class="formgroup">

            <button
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
          </div>

        </div>
      </div>
      
      </form>     
  </div>
</template>