<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useSyncStore } from '@/stores/sync'
import { PDSClient } from '@/lib/pds'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const sync = useSyncStore()
const pdsClient = new PDSClient()
const showPrompt = ref(false)

// Add to script setup
onMounted(() => {
  if (auth.session) {
    checkForUpdates()
  }
})

watch(() => auth.session, (newSession) => {
  if (newSession) {
    checkForUpdates() 
  }
})

const checkForUpdates = async () => {
  if (!auth.session) return
  
  pdsClient.setAuth(auth.session.accessJwt)
  const pendingArticles = await sync.checkSync(pdsClient)
  
  if (pendingArticles.length > 0) {
    showPrompt.value = true
  }
}

const handleSync = async () => {
  if (!auth.session) return
  
  pdsClient.setAuth(auth.session.accessJwt)
  const pendingArticles = await sync.checkSync(pdsClient)
  await sync.syncArticles(pendingArticles, pdsClient)
  showPrompt.value = false
}

const dismiss = () => {
  showPrompt.value = false
}
</script>

<template>
  <table v-if="showPrompt"
  :style="{'border-color': '#f4b8e4'}"
  >
  <tbody>
    <tr>
      <td colspan="2" v-if="!sync.syncing">
        Welcome back! Your PDS contains {{ sync.pendingArticles }} articles that aren't on this device.
      </td>
      <td colspan="2" v-else>
        Syncing your local DB with yoru PDS... {{ sync.progress }}%...
      </td>
    </tr>
    <tr v-if="sync.error">
      <td>
        {{ sync.error.message }}
      </td>
    </tr>
    <tr>
      <th>OPTIONS</th>
      <td>
        <button
          @click="handleSync"
          :disabled="sync.syncing"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sync Now
        </button>
        &nbsp;
        <button
          @click="dismiss"
          :disabled="sync.syncing" 
          class="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Dismiss
        </button>
      </td>
    </tr>
  </tbody>
  </table>
</template>