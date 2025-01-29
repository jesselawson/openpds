export interface Article {
    id: string
    title: string
    content: string
    published: boolean
    publishedAt?: Date
    revision: number
    postUri?: string
    syncStatus: 'LOCAL' | 'SYNCING' | 'SYNCED' | 'ERROR'
    mediaRefs: string[]
    lastModified: Date
    authorDid: string
  }
  
  export interface Session {
    did: string
    handle: string
    accessJwt: string
    refreshJwt: string
    expires: Date
    deviceId: string
    lastActive: Date
  }
  
  export interface MediaUpload {
    id: string
    file: File
    status: 'PENDING' | 'UPLOADING' | 'DONE' | 'ERROR'
    progress: number
    r2Key?: string
    retryCount: number
  }
  
  export interface SyncJob {
    id: string
    articleId: string
    type: 'CREATE' | 'UPDATE' | 'DELETE'
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'ERROR'
    error?: Error
    attempts: number
  }
  
  export interface EditorState {
    article: Article | null
    saved: boolean
    savingStatus: 'IDLE' | 'SAVING' | 'ERROR'
    lastError?: Error,
    showConflict: boolean,
    conflictData: {
      local: Pick<Article, 'title' | 'content'> | null
      remote: { title: string; text: string } | null
    },
    resolveConflict?: (useRemote: boolean) => void,
    lastOperationStatus: string
  }
  
  // Analytics event types
  export type AnalyticsEvent = 
    | 'ARTICLE_CREATE'
    | 'ARTICLE_PUBLISH' 
    | 'SYNC'
    | 'UPLOAD'
  
  export type ErrorType = 
    | 'SYNC'
    | 'AUTH'
    | 'MEDIA'
    | 'EDITOR'

export type ViewMode = 'edit' | 'preview' | 'split';

export interface EditorState {
  content: string;
  mode: ViewMode;
}