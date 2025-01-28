import type { Article } from '@/types'
import { getDB } from './index'
import type { IDBPCursor, IDBPCursorWithValue } from 'idb'
import type {OpenPDSDB} from './index';
import { serializeArticle } from './serialization';

export interface ListOpts {
  limit?: number
  offset?: number
  orderBy?: 'lastModified' | 'title'
  order?: 'asc' | 'desc'
  syncStatus?: Article['syncStatus']
}

export class ArticleDB {
  /**
   * Creates a new article in IndexedDB
   * Validates required fields and sets defaults
   */
  async create(article: Omit<Article, 'revision' | 'syncStatus' | 'lastModified'>): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('articles', 'readwrite')
    await tx.store.add({
      ...article,
      revision: 1,
      syncStatus: 'LOCAL', 
      lastModified: new Date()
    })
    await tx.done
  }

  /**
   * Retrieves an article by ID
   * Returns null if not found
   */
  async get(id: string): Promise<Article | null> {
    const db = await getDB()
    const article = await db.get('articles', id)
    return article || null
  }

  /**
   * Updates an existing article
   * Increments revision and updates lastModified
   * Throws if article doesn't exist
   */
  async update(id: string, updates: Partial<Article>): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('articles', 'readwrite')
    
    const article = await tx.store.get(id)
    if (!article) {
      throw new Error(`Article ${id} not found`)
    }
    
    if (updates.lastModified && article.lastModified > updates.lastModified) {
      throw new Error('Conflict: Article was modified')
    }

    const updatedArticle: Article = {
      ...article,
      ...updates,
      revision: article.revision + 1,
      lastModified: new Date()
    }
  
    await tx.store.put(updatedArticle)
    await tx.done
  }

  /**
   * Deletes an article by ID
   * No-op if article doesn't exist
   */
  
async delete(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('articles', 'readwrite')
  await tx.store.delete(id)
  await tx.done
}

  /**
   * Lists articles with filtering and pagination
   * Uses indexes for efficient queries
   */
  async list(opts: ListOpts = {}): Promise<Article[]> {
    const db = await getDB()
    const tx = db.transaction('articles', 'readonly')
    
    let cursor: IDBPCursorWithValue<OpenPDSDB, ["articles"], "articles", any, "readonly"> | null
  
    if (opts.syncStatus) {
      cursor = await tx.store.index('by-status').openCursor(opts.syncStatus)
    } else if (opts.orderBy === 'lastModified') {
      cursor = await tx.store.index('by-modified').openCursor(undefined, 
        opts.order === 'desc' ? 'prev' : 'next')
    } else {
      cursor = await tx.store.openCursor()
    }
  
    const articles: Article[] = []
    let skipped = 0
    const offset = opts.offset || 0
    const limit = opts.limit || Infinity
  
    while (cursor && articles.length < limit) {
      if (skipped < offset) {
        skipped++
        cursor = await cursor.continue()
        continue
      }
      articles.push(cursor.value)
      cursor = await cursor.continue()
    }
  
    await tx.done
    return articles
  }

  /**
   * Bulk updates multiple articles
   * All updates happen in single transaction
   */
  async bulkUpdate(updates: { id: string, article: Partial<Article> }[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('articles', 'readwrite')
  
    // Sequential updates to avoid transaction timeout
    for (const { id, article } of updates) {
      const existing = await tx.store.get(id)
      if (!existing) {
        throw new Error(`Article ${id} not found`)
      }
  
      const updated: Article = {
        ...existing,
        ...article,
        revision: existing.revision + 1,
        lastModified: new Date()
      }
  
      await tx.store.put(updated)
    }
  
    await tx.done
  }

  /**
   * Gets articles modified after given date
   * Useful for sync operations
   */
  async getModifiedAfter(date: Date): Promise<Article[]> {
    const db = await getDB()
    const tx = db.transaction('articles', 'readonly')
    const index = tx.store.index('by-modified')
    const articles = await index.getAll(IDBKeyRange.lowerBound(date))
    await tx.done
    return articles
  }
}