import { createPinia } from 'pinia'
const pinia = createPinia()
import { defineStore } from 'pinia'
import { PDSClient } from '@/lib/pds'
import { useAuthStore } from './auth'
import { ArticleDB } from '@/db/article'
import type { Article } from '@/types'

interface SyncState {
  syncing: boolean
  error: Error | null
}

export const useSyncStore = defineStore('sync', {
  state: (): SyncState => ({
    syncing: false,
    error: null
  }),

  actions: {
    async publishArticle(article: Article) {
      if (!article.published) {
        const db = new ArticleDB()
        await db.update(article.id, {
          published: true,
          publishedAt: new Date(),
          syncStatus: 'SYNCING'
        })
      }
      
      await this.syncArticle(article.id)
    },

    async syncArticle(articleId: string) {
      this.syncing = true
      this.error = null
      const auth = useAuthStore()
      
      try {
        if (!auth.session?.accessJwt) {
          throw new Error('Not authenticated')
        }

        const db = new ArticleDB()
        const article = await db.get(articleId)
        if (!article) {
          throw new Error('Article not found')
        }

        const pds = new PDSClient()
        pds.setAuth(auth.session.accessJwt)
        
        const result = await pds.syncArticle(article)
        
        if (result.status === 'CONFLICT') {
          await db.update(articleId, {
            syncStatus: 'ERROR',
            revision: result.remoteRevision
          })
          throw new Error('Sync conflict detected')
        }

        if (result.status === 'ERROR') {
          await db.update(articleId, { syncStatus: 'ERROR' })
          throw result.error
        }

      } catch (err) {
        this.error = err as Error
        throw err
      } finally {
        this.syncing = false
      }
    }
  }
})