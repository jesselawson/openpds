<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { MarkdownService } from '../services/markdown';
import type { ViewMode } from '../types';

const props = defineProps<{
  modelValue?: string;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const content = computed({
  get: () => props.modelValue ?? '',
  set: (value) => emit('update:modelValue', value)
});
const currentMode = ref<ViewMode>('edit');

const renderedContent = computed(() => {
  return MarkdownService.render(content.value);
});

const setMode = (mode: ViewMode) => {
  currentMode.value = mode;
};

</script>


<template>
    <div class="markdown-editor">
      <div class="toolbar">
        <div class="view-toggles">
          <button 
            v-for="mode in ['edit', 'preview', 'split']" 
            :key="mode"
            :class="{ active: currentMode === mode }"
            @click="setMode(mode as ViewMode)"
          >
            {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
          </button>
        </div>
      </div>
  
      <div class="editor-container" :class="currentMode">
        <textarea
          v-if="['edit', 'split'].includes(currentMode)"
          v-model="content"
          class="editor"
          placeholder="Enter markdown here..."
        ></textarea>
        
        <div 
          v-if="['preview', 'split'].includes(currentMode)"
          class="preview markdown-body"
          v-html="renderedContent"
        ></div>
      </div>
    </div>
  </template>