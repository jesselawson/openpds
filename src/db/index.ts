import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Article, Session, MediaUpload, SyncJob } from '@/types'

export interface OpenPDSDB extends DBSchema {
  articles: {
    key: string
    value: Article
    indexes: {
      'by-modified': Date
      'by-status': string
    }
  }
  sessions: {
    key: string
    value: Session
  }
  media: {
    key: string
    value: MediaUpload
    indexes: {
      'by-status': string
    }
  }
  syncQueue: {
    key: string
    value: SyncJob
    indexes: {
      'by-status': string
      'by-article': string
    }
  }
}

const DB_NAME = 'openpds-db'
const DB_VERSION = 1

export async function initDB(): Promise<IDBPDatabase<OpenPDSDB>> {
  return openDB<OpenPDSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Initial setup
      if (oldVersion < 1) {
        const articles = db.createObjectStore('articles', { keyPath: 'id' })
        articles.createIndex('by-modified', 'lastModified')
        articles.createIndex('by-status', 'syncStatus')

        const sessions = db.createObjectStore('sessions', { keyPath: 'did' })

        const media = db.createObjectStore('media', { keyPath: 'id' })
        media.createIndex('by-status', 'status')

        const syncQueue = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncQueue.createIndex('by-status', 'status')
        syncQueue.createIndex('by-article', 'articleId')
      }
    }
  })
}

let db: IDBPDatabase<OpenPDSDB>

export async function getDB() {
  if (!db) {
    db = await initDB()
  }
  return db
}