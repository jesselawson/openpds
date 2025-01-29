import { AtpAgent } from '@atproto/api'
import type { Article } from '@/types'
import { ArticleDB } from '@/db/article'

const ARTICLE_COLLECTION = 'org.openpds.article'

export interface SyncResult {
  status: 'SUCCESS' | 'CONFLICT' | 'ERROR'
  error?: Error
  remoteRevision?: number
}

interface ArticleRecord {
  title: string
  text: string
  media?: Blob[]
  publishedAt?: Date
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

  
  // Tries to retrieve an article from the PDS so that the local version 
  // becomes up to date:
  async syncArticle(article: Article): Promise<SyncResult> {
    if (!article.published) {
      throw new Error('Cannot sync unpublished article')
    }
    
    try {
      const remote = await this.agent.com.atproto.repo.getRecord({
        collection: 'org.openpds.article',
        repo: article.authorDid,
        rkey: article.id
      })

      const remoteArticle = remote.data.value as ArticleRecord
      
      if (remoteArticle.text !== article.content || remoteArticle.title !== article.title) {
        return {
          status: 'CONFLICT',
          remoteRevision: article.revision + 1
        }
      }
      
      return this.updateArticle(article)
      
    } catch (err: any) {
      // If not found (PDS returns 400, not 404), create the article in PDS
      if (err.statusCode === 400 || err.error == "RecordNotFound") {
        return this.createArticle(article)
      }
      
      return { status: 'ERROR', error: err as Error }
    }
  }

  private async createArticle(article: Article): Promise<SyncResult> {
    try {
      const result = await this.agent.com.atproto.repo.createRecord({
        collection: ARTICLE_COLLECTION,
        repo: article.authorDid,
        rkey: article.id,
        record: {
          title: article.title,
          text: article.content,
          publishedAt: article.publishedAt,
          media: article.mediaRefs
        }
      })

      await this.db.update(article.id, {
        syncStatus: 'SYNCED',
        postUri: result.data.uri
      })

      return { status: 'SUCCESS' }
    } catch (err) {
      return { status: 'ERROR', error: err as Error}
    }
  }

  private async updateArticle(article: Article): Promise<SyncResult> {
    try {
      await this.agent.com.atproto.repo.putRecord({
        collection: ARTICLE_COLLECTION,
        repo: article.authorDid,
        rkey: article.id,
        record: {
          title: article.title,
          text: article.content,
          publishedAt: article.publishedAt,
          media: article.mediaRefs
        }
      })

      await this.db.update(article.id, { 
        syncStatus: 'SYNCED'
      })

      return { status: 'SUCCESS' }
    } catch (err) {
      return { status: 'ERROR', error: err as Error }
    }
  }
}