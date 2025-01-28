
<script setup lang="ts">
defineEmits(['confirm', 'skip'])
defineProps<{
  isLoading?: boolean
}>()
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-lg font-semibold">Setup Required</h2>
      
      <div class="py-4">
        <p class="text-sm text-gray-600">
          This app needs to register OpenPDS schemas to enable article publishing. 
          This is a one-time setup that will:
        </p>
        <ul class="mt-2 text-sm text-gray-600 list-disc pl-4">
          <li>Register org.openpds namespace</li>
          <li>Define article schema</li>
        </ul>
      </div>

      <div class="flex justify-end gap-2">
        <button 
          @click="$emit('skip')"
          :disabled="isLoading"
          class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md disabled:opacity-50"
        >
          Skip for now
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="isLoading"
          class="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:opacity-50 flex items-center gap-2"
        >
          <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          {{ isLoading ? 'Setting up...' : 'Set up schemas' }}
        </button>
      </div>
    </div>
  </div>
</template>