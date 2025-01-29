<script setup lang="ts">
import { ref } from 'vue'
import { useSyncStore } from '@/stores/sync'
import { PDSClient } from '@/lib/pds'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const sync = useSyncStore()
const pdsClient = new PDSClient()
const showPrompt = ref(false)

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
  <div v-if="showPrompt" class="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg">
    <div class="flex items-center gap-4">
      <div>
        <p class="font-medium">
          Welcome back! Your PDS contains {{ sync.pendingArticles }} articles that aren't on this device.
        </p>
        <div v-if="sync.syncing" class="mt-2">
          <div class="h-2 bg-gray-200 rounded">
            <div 
              class="h-full bg-blue-500 rounded" 
              :style="{ width: sync.progress + '%' }"
            />
          </div>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button
          @click="handleSync"
          :disabled="sync.syncing"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sync Now
        </button>
        <button
          @click="dismiss"
          :disabled="sync.syncing" 
          class="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Dismiss
        </button>
      </div>
    </div>
    
    <p v-if="sync.error" class="mt-2 text-red-500 text-sm">
      {{ sync.error.message }}
    </p>
  </div>
</template>