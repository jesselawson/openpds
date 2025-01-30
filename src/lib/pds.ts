import { AtpAgent } from '@atproto/api'
import type { Article } from '@/types'
import { ArticleDB } from '@/db/article'

const ARTICLE_COLLECTION = 'org.openpds.article'

export interface SyncResult {
  status: 'SUCCESS' | 'CONFLICT' | 'ERROR' | 'CANCELLED'
  error?: Error
  remoteRevision?: number,
  useLocalVersion?: boolean
}

interface ArticleRecord {
  title: string
  text: string
  media?: Blob[]

  // This gets updated on EVERY sync:
  publishedAt?: Date
}

interface SyncOptions {
  onConflict?: (local: Article, remote: ArticleRecord) => Promise<boolean | null>  // null = cancelled
}

export class PDSClient {
  private agent: AtpAgent
  private db = new ArticleDB()

  constructor(service = 'https://bsky.social') {
    this.agent = new AtpAgent({ service })
  }

  setAuth(jwt: string) {
    this.agent.setHeader('Authorization', `Bearer ${jwt}`)
  }

  async listArticles(authorDid: string): Promise<Article[]> {
    try {
      const { data } = await this.agent.com.atproto.repo.listRecords({
        collection: ARTICLE_COLLECTION,
        repo: authorDid,
        limit: 100 // Arbitrary
      })

      console.log(data.records);

      return data.records.map(record => ({
        id: record.uri.split('/').pop(),
        title: record.value.title,
        content: record.value.text,
        published: true, // PDS only has published articles
        publishedAt: record.value.publishedAt,
        revision: 1, // PDS doesn't track revisions
        postUri: record.uri,
        syncStatus: 'SYNCED',
        mediaRefs: record.value.media || [],
        lastModified: record.value.publishedAt,
        authorDid: authorDid
      }))
    } catch (err) {
      throw new Error(`Failed to list articles: ${err.message}`)
    }
  }


  // Tries to retrieve an article from the PDS so that the local version
  // becomes up to date:
  async syncArticle(article: Article, options?: SyncOptions): Promise<SyncResult> {
    if (!article.published) {
      throw new Error('Cannot sync unpublished article')
    }

    try {
      const remote = await this.agent.com.atproto.repo.getRecord({
        collection: ARTICLE_COLLECTION,
        repo: article.authorDid,
        rkey: article.id
      })

      const remoteArticle = remote.data.value as ArticleRecord

      if (remoteArticle.text !== article.content || remoteArticle.title !== article.title) {
        if(!options?.onConflict) {
          return { status: 'CONFLICT', remoteRevision: article.revision + 1 }
        }

        const useRemote = await options.onConflict(article, remoteArticle)

        if (useRemote === null) {
          return { status: 'CANCELLED' }
        }

        if(useRemote) {
          await this.db.update(article.id, {
            title: remoteArticle.title,
            content: remoteArticle.text,
            syncStatus: 'SYNCED'
          })
          return { status: 'SUCCESS', useLocalVersion: false }
        }

        // Using local version - will be handled by updateArticle
        return this.updateArticle(article, true)
      }

      return this.updateArticle(article)

    } catch (err: any) {
      if (err.statusCode === 400 || err.error == "RecordNotFound") {
        return this.createArticle(article)
      }
      return { status: 'ERROR', error: err as Error }
    }
  }

  async deleteArticle(article: Article): Promise<void> {
    try {
      await this.agent.com.atproto.repo.deleteRecord({
        collection: ARTICLE_COLLECTION,
        repo: article.authorDid,
        rkey: article.id
      })
    } catch (err) {
      if (err.error === 'RecordNotFound') {
        // Already deleted from PDS, can proceed with local delete
        return
      }
      throw err 
    }
  }

  private async createArticle(article: Article): Promise<SyncResult> {
    try {
      const now = new Date();
      const result = await this.agent.com.atproto.repo.createRecord({
        collection: ARTICLE_COLLECTION,
        repo: article.authorDid,
        rkey: article.id,
        record: {
          title: article.title,
          text: article.content,
          publishedAt: now,
          media: article.mediaRefs
        }
      })

      await this.db.update(article.id, {
        syncStatus: 'SYNCED',
        postUri: result.data.uri,
        publishedAt: now,
      })

      return { status: 'SUCCESS', useLocalVersion: true }
    } catch (err) {
      return { status: 'ERROR', error: err as Error}
    }
  }

  private async updateArticle(article: Article, isConflictResolution = false): Promise<SyncResult> {

    try {
      const now = new Date();

      await this.agent.com.atproto.repo.putRecord({
        collection: ARTICLE_COLLECTION,
        repo: article.authorDid,
        rkey: article.id,
        record: {
          title: article.title,
          text: article.content,
          publishedAt: now,
          media: article.mediaRefs
        }
      })

      await this.db.update(article.id, {
        syncStatus: 'SYNCED',
        publishedAt: now // Update local to match PDS
      })

      return {
        status: 'SUCCESS',
        useLocalVersion: isConflictResolution
      }
    } catch (err) {
      return { status: 'ERROR', error: err as Error }
    }
  }
}
