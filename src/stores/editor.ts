import { defineStore } from 'pinia'
import { ArticleDB } from '@/db/article'
import { toRaw } from 'vue'
import type { EditorState, Article } from '@/types'
import { useAuthStore } from './auth'
import { PDSClient } from '@/lib/pds'

export const useEditorStore = defineStore('editor', {
  state: (): EditorState => ({
    article: null,
    saved: true,
    savingStatus: 'IDLE',
    lastError: undefined,
    content: "",
    mode: 'edit'
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
      } catch (err) {
        this.savingStatus = 'ERROR'
        this.lastError = err as Error
        throw err
      }
    },

    async syncArticle() {
      if (!this.article) return
      
      const auth = useAuthStore()
      if (!auth.session) throw new Error('Not authenticated')

      this.savingStatus = 'SAVING'
      try {
        const pds = new PDSClient()
        pds.setAuth(auth.session.accessJwt)
        const result = await pds.syncArticle(this.article)

        if (result.status === 'ERROR') throw result.error
        if (result.status === 'CONFLICT') {
          this.article.syncStatus = 'ERROR'
          throw new Error('Sync conflict detected')
        }

        this.article.syncStatus = 'SYNCED'
      } catch (err) {
        this.lastError = err as Error
        throw err
      } finally {
        this.savingStatus = 'IDLE'
      }
    },

    async publishArticle() {
      if (!this.article) return
      
      const auth = useAuthStore()
      if (!auth.session) throw new Error('Not authenticated')

      this.savingStatus = 'SAVING'
      try {
        const db = new ArticleDB()
        
        // Update article state first
        await db.update(this.article.id, {
          syncStatus: 'SYNCING'
        })

        const pds = new PDSClient()

        pds.setAuth(auth.session.accessJwt)
        
        const result = await pds.syncArticle(this.article)

        if (result.status === 'ERROR') throw result.error
        if (result.status === 'CONFLICT') {
          await db.update(this.article.id, { syncStatus: 'ERROR' })
          throw new Error('Sync conflict detected')
        }

        this.article.published = true
        this.article.publishedAt = new Date()
        this.article.syncStatus = 'SYNCED'
      } catch (err) {
        this.lastError = err as Error
        throw err
      } finally {
        this.savingStatus = 'IDLE'
      }
    }
  }
})