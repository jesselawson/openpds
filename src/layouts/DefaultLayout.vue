<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import NamespaceSetup from '@/components/NamespaceSetup.vue'

const auth = useAuthStore()
const router = useRouter()
const isAuthenticated = computed(() => auth.isAuthenticated)

const logout = async () => {
  await auth.logout()
  router.push('/auth/login')
}

const isSettingUp = ref(false)

const handleSetup = async () => {
  isSettingUp.value = true
  try {
    await auth.setupSchemas()
  } catch (err) {
    console.error('Failed to setup schemas:', err)
  } finally {
    isSettingUp.value = false
  }
}

const handleSkip = () => {
  router.push('/')
}

</script>

<template>
  <NamespaceSetup
    v-if="auth.needsSchemaSetup"
    @confirm="handleSetup"
    @skip="handleSkip"
  />
  <div v-else>
  <table>  
    <tbody>
      <tr>
        <td colspan="2">
          <h1 class="title">OpenPDS Articles Editor</h1>
          <p>ALPHA PROTOTYPE</p>
        </td>
      </tr>
    <tr>
      <th>STATUS</th>
    <td v-if="isAuthenticated">Authenticated as @{{ auth.session?.handle }}<br/><small>{{  auth.session?.did }}</small></td>
    <td v-else>(logged out)</td>
  </tr>
  <tr v-if="isAuthenticated">
    <th>MENU</th>
    <td class="width-min">
      <button v-if="router.currentRoute.value.name == 'editor'"
      @click="router.push('/')">&larr; Back to articles</button>
      <button v-if="router.currentRoute.value.name == 'home'"
      @click="logout">Logout</button>
    </td>
  </tr>
  </tbody>
</table>
  
    <main class="flex-1">
      <router-view />
    </main>
  </div>

</template>