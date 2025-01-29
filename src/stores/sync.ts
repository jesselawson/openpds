import { defineStore } from 'pinia'
import { PDSClient } from '@/lib/pds'
import { useAuthStore } from './auth'
import { ArticleDB } from '@/db/article'
import type { Article } from '@/types'
import { useEditorStore } from './editor'

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
      const auth = useAuthStore()
      
      try {
        const remoteArticles = await pdsClient.listArticles(auth.session.did)
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
        if (!auth.session?.accessJwt) throw new Error('Not authenticated')
        const db = new ArticleDB()
        const article = await db.get(articleId)
        if (!article) throw new Error('Article not found')
    
        const pds = new PDSClient()
        pds.setAuth(auth.session.accessJwt)
        
        // Pass conflict handler
        const result = await pds.syncArticle(article, {
          onConflict: async (local, remote) => {
            // Pass to editor store for UI handling
            const editor = useEditorStore() 
            return new Promise<boolean>((resolve) => {
              editor.showConflict = true
              editor.conflictData = {
                local: { title: local.title, content: local.content },
                remote: { title: remote.title, text: remote.text }
              }
              editor.resolveConflict = resolve
            })
          }
        })
    
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