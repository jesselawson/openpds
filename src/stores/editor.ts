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
        this.lastOperationStatus = 'Article successfully saved to local DB'
      } catch (err) {
        this.savingStatus = 'ERROR'
        this.lastError = err as Error
        this.lastOperationStatus = 'Failed to save article to local DB'
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
        const db = new ArticleDB()
        pds.setAuth(auth.session.accessJwt)

        const result = await pds.syncArticle(this.article, {
          onConflict: async (local, remote) => {
            return new Promise<boolean>((resolve) => {
              this.showConflict = true 
              this.conflictData = {
                local: { title: local.title, content: local.content },
                remote: { title: remote.title, text: remote.text }
              }
              this.resolveConflict = resolve
            })
          }
        })

        if (result.status === 'ERROR') throw result.error

        if(result.status === 'SUCCESS' && result.useLocalVersion) {
          const now = new Date()
          await db.update(this.article.id, {
            publishedAt: now,
            syncStatus: 'SYNCED'
          })
          this.article.publishedAt = now
        }

        this.article.syncStatus = 'SYNCED'
        this.lastOperationStatus = 'Article successfully saved to local DB'

      } catch (err) {
        this.lastError = err as Error
        this.lastOperationStatus = 'Failed to save article to local DB'
        throw err
      } finally {
        this.savingStatus = 'IDLE'
        this.showConflict = false
        this.conflictData = { local: null, remote: null }
        this.resolveConflict = undefined
        
      }
    },

    async resolveConflictChoice(choice: 'remote' | 'local' | 'cancel') {
      if (!this.resolveConflict) return
      
      if (choice === 'cancel') {
        this.lastOperationStatus = 'Sync cancelled'
      } else {
        // Refresh editor state with remote version
        this.resolveConflict(choice === 'remote')

        if(choice === 'remote' && this.article) {
          // If we're overwriting local changes, set local lastmod to published date:
          if(this.article.publishedAt) this.article.lastModified = this.article.publishedAt;
          await this.loadArticle(this.article.id);
        }

        this.lastOperationStatus = choice === 'remote' ? 'Local changes overwritten with PDS version' : 'PDS version updated with latest local changes';
      }
    
      // Clean up state
      this.showConflict = false
      this.conflictData = { local: null, remote: null }
    },

    async deleteArticle(id: string) {
      const db = new ArticleDB()
      await db.delete(id)
      this.article = null
      this.saved = true
      this.lastOperationStatus = `Article '${id}' deleted`
    },

    async publishArticle() {
      if (!this.article) return
      
      const auth = useAuthStore()
      if (!auth.session) throw new Error('Not authenticated')

      this.savingStatus = 'SAVING'
      try {
        const db = new ArticleDB()
        const now = new Date()
        
        await db.update(this.article.id, {
          published: true,
          publishedAt: now,
          syncStatus: 'SYNCING'
        })
        
        this.article.published = true
        this.article.publishedAt = now
        this.article.syncStatus = 'SYNCING'

        const pds = new PDSClient()
        pds.setAuth(auth.session.accessJwt)
        const result = await pds.syncArticle(this.article)

        if (result.status === 'ERROR') throw result.error
        if (result.status === 'CONFLICT') {
          await db.update(this.article.id, { syncStatus: 'ERROR' })
          throw new Error('Sync conflict detected')
        }

        this.article.syncStatus = 'SYNCED'
        this.lastOperationStatus = 'Article successfully published to PDS'
      } catch (err) {
        this.lastError = err as Error
        this.lastOperationStatus = 'Failed to publish article to PDS'
        throw err
      } finally {
        this.savingStatus = 'IDLE'
      }
    }
  }
})