import { defineStore } from 'pinia'
import { ArticleDB } from '@/db/article'
import { toRaw } from 'vue'
import type { EditorState, Article } from '@/types'
import { useAuthStore } from './auth'
import { useSyncStore } from './sync'
import { PDSClient } from '@/lib/pds'

export const useEditorStore = defineStore('editor', {
  state: (): EditorState => ({
    article: null,
    saved: true,
    savingStatus: 'IDLE',
    lastError: undefined,
    content: "",
    mode: 'edit',
    showConflict: false,
    conflictData: { local: null, remote: null },
    resolveConflict: undefined,
    lastOperationStatus: ''
  }),

  actions: {
    async loadArticle(id: string) {
      const db = new ArticleDB()
      this.article = await db.get(id)
    },

    async saveArticle() {
      if (!this.article) return
      
      this.savingStatus = 'SAVING'
      try {
        const db = new ArticleDB()
        const rawArticle = toRaw(this.article)
        const { lastModified, ...updates } = rawArticle
        await db.update(rawArticle.id, updates)
        this.saved = true
        this.savingStatus = 'IDLE'
        this.lastOperationStatus = 'Article synced with Local DB'
      } catch (err) {
        this.savingStatus = 'ERROR'
        this.lastError = err as Error
        this.lastOperationStatus = 'Failed to sync article with Local DB'
        throw err
      }
    },

    async deleteArticle(id: string) {
      const db = new ArticleDB()
      const sync = useSyncStore()
      await sync.deleteArticle(id);
      
      await db.delete(id)
      this.article = null
      this.saved = true
      this.lastOperationStatus = `Article '${id}' deleted`
    },

    async publishArticle() {
      if (!this.article) return
      
      const auth = useAuthStore()
      if (!auth.session) throw new Error('Not authenticated')

      const sync = useSyncStore()
      this.savingStatus = 'SAVING'
      
      try {
        await sync.publishArticle(this.article)
        await this.loadArticle(this.article.id) // Reload to get updated state
        this.lastOperationStatus = 'Article published to PDS'

      } catch (err) {
        this.lastError = err as Error
        this.lastOperationStatus = 'Failed to publish to PDS (check console)'
        throw err
      } finally {
        this.savingStatus = 'IDLE'
      }
    }
  }
})