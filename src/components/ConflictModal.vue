<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '@/types'
import * as diff from 'diff'

interface Props {
  modelValue: boolean
  local: { title: string; content: string }
  remote: { title: string; text: string }
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue', 'resolve'])

const titleDiff = computed(() => diff.diffChars(props.local.title, props.remote.title))
const contentDiff = computed(() => diff.diffChars(props.local.content, props.remote.text))
</script>

<template>
  <Teleport to="body">
    <dialog v-if="modelValue" open>
      <h2>Sync Conflict</h2>
      <p>Remote changes conflict with local version. Choose which to keep:</p>

      <details open>
        <summary>Title Changes</summary>
        <pre><code><span
          v-for="(part, i) in titleDiff"
          :key="i"
          :style="{
            backgroundColor: part.added ? 'rgba(0,255,0,0.1)' : part.removed ? 'rgba(255,0,0,0.1)' : ''
          }"
        >{{ part.value }}</span></code></pre>
      </details>

      <details open>
        <summary>Content Changes</summary>
        <pre><code><span
          v-for="(part, i) in contentDiff"
          :key="i"
          :style="{
            backgroundColor: part.added ? 'rgba(0,255,0,0.1)' : part.removed ? 'rgba(255,0,0,0.1)' : ''
          }"
        >{{ part.value }}</span></code></pre>
      </details>

      <div class="grid">
        <button @click="emit('resolve', true)">Use Remote</button>
        <button @click="emit('resolve', false)">Keep Local</button>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(min(80ch, 100% - 4ch));
  max-height: calc(100vh - 4ch);
  overflow-y: auto;
}

dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}
</style>