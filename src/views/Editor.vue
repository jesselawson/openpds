<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import { useSyncStore } from '@/stores/sync'
import { ArticleDB } from '@/db/article'
import { useAuthStore } from '@/stores/auth'
import { nanoid } from 'nanoid'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import ConflictModal from '@/components/ConflictModal.vue'

const route = useRoute()
const router = useRouter()
const editor = useEditorStore()
const sync = useSyncStore()
const auth = useAuthStore()
const title = ref('')
const content = ref('')
let saveTimeout: number | undefined

const deleteArticle = async () => {
  if (!editor.article) return
  if (!confirm('Delete this article?')) return

  try {
    await editor.deleteArticle(editor.article.id)
    router.push({ name: 'home' })
  } catch (err) {
    console.error('Failed to delete article:', err)
  }
}

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

// Watch store article changes
watch(() => editor.article, (newArticle) => {
  if (newArticle) {
    title.value = newArticle.title
    content.value = newArticle.content
  }
}, { deep: true })

// Watch local input changes
watch([title, content], () => {
  if (!editor?.article) return
  editor.saved = false
  debouncedSave()
}, { immediate: false })

const publish = async () => {
  if (!editor.article) return
  try {
    await editor.publishArticle()
  } catch (err) {
    // If there's no postUri, then make sure published == false,
    // otherwise the UI messages get confusing:
    if (!editor.article.postUri) {
      editor.article.published = false
    }
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
    } else {
      throw new Error(`Tried to load article '${route.params.id}', but loadArticle ended up being empty`)
    }
  } else {
    const db = new ArticleDB()
    await db.create({
      id: nanoid(),
      title: '',
      syncStatus: "LOCAL",
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
        <th colspan="1">
        TITLE
        </th>
        <td colspan="1">
          <input
        v-model="title"
        type="text"
        placeholder="Untitled"
        class="width-auto"
      />
        </td>
      </tr>

      <tr v-if="editor.lastOperationStatus">
        <th colspan="1">LAST OP</th>
        <td>{{ editor.lastOperationStatus }}</td>
      </tr>

      <tr>
        <td colspan="2">
          <main>
          <MarkdownEditor
            v-model="content"
            placeholder="Start writing..."
            class="width-auto"
          />
          </main>
        </td>
      </tr>

      <tr>
        <th colspan="1">LOCAL</th>
        <td class="width-auto"  v-if="!editor?.saved">SAVING...</td>
        <td class="width-auto"  v-if="editor?.saved && editor?.article">SAVED &nbsp;&nbsp;&nbsp;&nbsp;{{ new Intl.DateTimeFormat('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles',
            timeZoneName: 'short'
          }).format(editor?.article.lastModified) }}
        </td>
        <td class="width-auto"  v-if="editor?.article?.title === 'Untitled'">(waiting for content)</td>
      </tr>
      <tr>
        <th>PDS</th>
        <td class="width-auto">
          <span v-if="editor?.article?.published">PUBLISHED {{ new Intl.DateTimeFormat('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Los_Angeles',
              timeZoneName: 'short'
            }).format(editor?.article.publishedAt) }}</span>
          <span v-else-if="sync.syncing">PUBLISHING NOW...</span>
          <span v-else>NOT PUBLISHED (<a href="#" @click="publish">publish now</a>)</span>
        </td>
      </tr>
      <tr v-if="sync.error">
          <th>ERROR</th>
          <td>{{ sync.error.message }}</td>
        </tr>
      <tr>
        <td colspan="2">
          <button
          @click="publish"
          :disabled="!editor?.saved || sync.syncing"
        >
          {{ sync.syncing ? 'Sync in progress...' : 'Publish (Sync with PDS)' }}
        </button>

        <button
          @click="deleteArticle"
          style="float:right; background-color:black"
        >
          Delete
        </button>
        </td>
      </tr>
    </tbody>
    <ConflictModal v-if="sync.conflictData.local && sync.conflictData.remote"
  v-model="sync.showConflict"
  :local="sync.conflictData.local"
  :remote="sync.conflictData.remote"
  @resolve="(choice) => editor.article && sync.resolveConflict(editor.article.id, choice)"
/>
  </table>
</template>
