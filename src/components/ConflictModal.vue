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

const titleDiff = computed(() => diff.diffLines(props.remote.title, props.local.title))
const contentDiff = computed(() => diff.diffLines(props.remote.text, props.local.content))
</script>

<template>
  <Teleport to="body">
    <dialog class="conflictdialog" v-if="modelValue" open>
      <h2>Review Changes</h2>
      <p>The local version of your article is different from the version currently published in your PDS.</p>
      <p>You can either <b>PUSH</b> your local changes to your PDS, our you can <b>PULL</b> what's currently published in your 
        PDS and overwrite your local version. If you do this, you'll lose your local changes, so only do this if you want to 
        reset your local version to what is currently published in your PDS.</p>

      <details open>
        <summary>Title Changes</summary>
        <pre><code><span
          v-for="(part, i) in titleDiff"
          :key="i"
          :style="{
            backgroundColor: part.added ? 'rgba(166, 218, 149,0.4)' : part.removed ? 'rgba(243, 139, 168,0.4)' : ''
          }"
        >{{ part.value }}</span></code></pre>
      </details>

      <details open>
        <summary>Content Changes</summary>
        <pre><code><span
          v-for="(part, i) in contentDiff"
          :key="i"
          :style="{
            backgroundColor: part.added ? 'rgba(166, 218, 149,0.4)' : part.removed ? 'rgba(243, 139, 168,0.4)' : ''
          }"
        >{{ part.value }}</span></code></pre>
      </details>

      
        <div class="grid vertical-middle">
            <button @click="emit('resolve', 'local')">(PUSH) &uarr;</button>
            <div>
                <p>Overwrite PDS with LOCAL version</p>
                <p class="meta">Choose this option to publish your local changes to your PDS. This will overwrite the PDS version of your article with the current version you have locally.</p>
            </div>
        </div>

        <div class="grid vertical-middle">
            <button @click="emit('resolve', 'remote')">(PULL) &darr;</button>
            <div>
                <p>Overwrite LOCAL with PDS version</p>
                <p class="meta">Choose this option to replace your current local version with the published version in your PDS. This will overwrite all changes you've made locally, and bring your local version in sync with what's currently published in your PDS.</p>
            </div>
        </div>

        <div class="grid vertical-middle">
            <button @click="emit('update:modelValue', false); emit('resolve', 'cancel')">(CANCEL) &larr;</button>
            <div>
                <p>Cancel publish operation and go back</p>
                <p class="meta">This modal will close.</p>
            </div>
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