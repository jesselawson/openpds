import { defineStore } from 'pinia'
import { PDSClient } from '@/lib/pds'
import { useAuthStore } from './auth'
import { ArticleDB } from '@/db/article'
import type { Article } from '@/types'

interface SyncState {
  syncing: boolean
  error: Error | null
  pendingArticles: number
  progress: number,
  showConflict: boolean
  conflictData: {
    local: { title: string; content: string } | null
    remote: { title: string; text: string } | null
  }
  resolveConflict?: (useRemote: boolean | null) => void
}

export const useSyncStore = defineStore('sync', {
  state: (): SyncState => ({
    syncing: false,
    error: null,
    pendingArticles: 0,
    progress: 0,
    showConflict: false,
    conflictData: { local: null, remote: null },
    resolveConflict: undefined
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
      console.log('Syncing articles:', articles) // Add this
      this.syncing = true
      this.progress = 0
      const total = articles.length

      try {
        const db = new ArticleDB()
        for (const [index, article] of articles.entries()) {
          const pubDate = new Date(article.publishedAt as Date);
          type status = "SYNCED" | "LOCAL" | "SYNCING" | "ERROR";
          const localArticle = {
            ...article,
            id: article.id,
            publishedAt: pubDate,
            syncStatus: "SYNCED" as status,
            revision: 1,
            mediaRefs: article.mediaRefs || [],
            published: true
          }

          await db.create(localArticle)

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

    async syncArticle(articleId: string): Promise<void> {
      if(!this.resolveConflict) return

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

        const result = await pds.syncArticle(article, {
          onConflict: async (local, remote) => {
            return new Promise<boolean | null>((resolve) => {
              this.showConflict = true
              this.conflictData = {
                local: { title: local.title, content: local.content },
                remote: { title: remote.title, text: remote.text }
              }
              this.resolveConflict = resolve
            })
          }
        })

        if(result.status ==='CANCELLED') {
          return
        }

        if (result.status === 'ERROR') {
          await db.update(articleId, { syncStatus: 'ERROR' })
          throw result.error
        }

        // Handle successful sync
        if (result.status === 'SUCCESS') {
          const now = new Date()
          await db.update(articleId, {
            syncStatus: 'SYNCED',
            publishedAt: now
          })
        }

      } catch (err) {
        this.error = err as Error
        throw err
      } finally {
        this.syncing = false
      }
    },

    async resolveConflict(articleId: string, choice: 'remote' | 'local' | 'cancel'): Promise<void> {
      if (!this.resolveConflict) return

      if (choice === 'cancel') {
        this.resolveConflict(null)
        // Just cleanup, don't resolve
        this.showConflict = false
        this.conflictData = { local: null, remote: null }
        return
      }

      const useRemote = choice === 'remote'
      if (useRemote) {
        const db = new ArticleDB()
        const article = await db.get(articleId)
        if (article?.publishedAt) {
          await db.update(articleId, {
            lastModified: article.publishedAt,
            syncStatus: 'SYNCED'
          })
        }
      }

      this.resolveConflict(useRemote)
      this.showConflict = false
      this.conflictData = { local: null, remote: null }
      this.resolveConflict = undefined
    },

    async publishArticle(article: Article): Promise<void> {
      if (!article.published) {
        const db = new ArticleDB()
        await db.update(article.id, {
          published: true,
          publishedAt: new Date(),
          syncStatus: 'SYNCING'
        })
      }

      await this.syncArticle(article.id)
    }
  }
})
