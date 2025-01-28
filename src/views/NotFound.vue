<script setup lang="ts">
// src/views/NotFound.vue

</script>
<template>
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-gray-900">404</h1>
        <p class="text-xl text-gray-600 mt-4">Page not found</p>
        <router-link 
          to="/" 
          class="mt-6 inline-block text-blue-500 hover:text-blue-600"
        >
          Go home
        </router-link>
      </div>
    </div>
</template>