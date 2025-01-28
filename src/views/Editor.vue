<script setup lang="ts">
import { ref, onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import { useSyncStore } from '@/stores/sync'
import { ArticleDB } from '@/db/article'
import { useAuthStore } from '@/stores/auth'
import { nanoid } from 'nanoid'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const route = useRoute()
const editor = useEditorStore()
const sync = useSyncStore()
const auth = useAuthStore()
const title = ref('')
const content = ref('')
let saveTimeout: number | undefined

const debouncedSave = () => {
  if (!editor.article) return
  window.clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    if(editor) {
      if(editor.article) {
        editor.article.title = title.value
        editor.article.content = content.value
        await editor.saveArticle()
      }
    }    
  }, 1000)
}

watchEffect(() => {
  if (!title.value || !content.value) return
  if (!editor?.article) return
  
  editor.saved = false
  debouncedSave()
})

const publish = async () => {
  if (!editor.article) return
  
  try {
    await sync.publishArticle(editor.article)
    editor.saved = true
  } catch (err) {
    console.error('Failed to publish:', err)
  }
}

onMounted(async () => {
  const authSession = auth.session
  if (!authSession) return

  if (route.params.id) {
    await editor.loadArticle(route.params.id as string)
    if (editor?.article) {
      title.value = editor.article.title
      content.value = editor.article.content
    }
  } else {
    const db = new ArticleDB()
    await db.create({
      id: nanoid(),
      title: '',
      content: '',
      published: false,
      mediaRefs: [],
      authorDid: authSession.did
    })
  }
})
</script>

<template>
  <table>
    <tbody>
      <tr>
        <th>
        TITLE
        </th>
        <td colspan="2">
          <input
        v-model="title"
        type="text"
        placeholder="Untitled"
        class="width-auto"
      />
        </td>
      </tr>

      <tr>
        <td colspan="4">
          <main>
          <MarkdownEditor
            v-model="content"
            placeholder="Start writing..."
            class="width-auto"
            style="min-height:25rem"
          />
          </main>
        </td>
      </tr>

      <tr>
        <th>LOCAL</th>
        <td v-if="!editor?.saved">SAVING...</td>
        <td v-else>SAVED {{ new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Los_Angeles',
  timeZoneName: 'short'
}).format(editor?.article.lastModified) }}</td>
        <td v-if="editor?.article?.title === 'Untitled'">(waiting for content)</td>
      </tr>
      <tr>
        <th>PDS</th>
        <td>
          <span v-if="editor?.article?.published">PUBLISHED {{ new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Los_Angeles',
  timeZoneName: 'short'
}).format(editor?.article.publishedAt) }} (Revision {{ editor?.article.revision }})</span>
          <span v-else-if="sync.syncing">PUBLISHING...</span>
          <span v-else>NOT PUBLISHED (<a href="#" @click="publish">publish now</a>)</span>
        </td>
      </tr>


    </tbody>
  </table>

  <div class="h-screen flex flex-col">
    <header class="border-b p-4 flex justify-between items-center">
      
      <div class="flex items-center gap-2">
        <span v-if="sync.syncing" class="text-sm text-gray-500">
          Publishing...
        </span>
        <span v-else-if="editor?.saved === false" class="text-sm text-gray-500">
          Saving...
        </span>
        <span v-if="sync.error" class="text-sm text-red-500">
          {{ sync.error.message }}
        </span>
        <button 
          @click="publish"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          :disabled="!editor?.saved || sync.syncing"
        >
          Publish
        </button>
      </div>
    </header>

    
  </div>
</template>