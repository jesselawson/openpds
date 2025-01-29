import { defineStore } from 'pinia'
import { PDSClient } from '@/lib/pds'
import { useAuthStore } from './auth'
import { ArticleDB } from '@/db/article'
import type { Article } from '@/types'

interface SyncState {
  syncing: boolean
  error: Error | null
  pendingArticles: number
  progress: number
}

export const useSyncStore = defineStore('sync', {
  state: (): SyncState => ({
    syncing: false,
    error: null,
    pendingArticles: 0,
    progress: 0
  }),

  actions: {
    async checkSync(pdsClient: PDSClient) {
      this.syncing = true
      try {
        const remoteArticles = await pdsClient.listArticles()
        const db = new ArticleDB()
        const localArticles = await db.list()
        
        const diff = remoteArticles.filter(remote => 
          !localArticles.find(local => local.id === remote.id)
        )
        
        this.pendingArticles = diff.length
        return diff
      } catch (err) {
        this.error = err as Error
        throw err
      } finally {
        this.syncing = false
      }
    },

    async syncArticles(articles: Article[], pdsClient: PDSClient) {
      this.syncing = true
      this.progress = 0
      const total = articles.length
      
      try {
        const db = new ArticleDB()
        for (const [index, article] of articles.entries()) {
          await db.create({
            ...article,
            syncStatus: 'SYNCED'
          })
          this.progress = Math.round(((index + 1) / total) * 100)
        }
        this.pendingArticles = 0
      } catch (err) {
        this.error = err as Error
        throw err
      } finally {
        this.syncing = false
      }
    },

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