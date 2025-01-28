# src/App.vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

</script>

<template>
  <router-view v-if="!authStore.loading" />
  <div v-if="authStore.loading" class="flex h-screen items-center justify-center">
    Loading
  </div>
</template>