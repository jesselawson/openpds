import type { Article } from '@/types'

export function serializeArticle(article: Partial<Article>): Partial<Article> {
  const {
    id,
    title,
    content,
    published,
    publishedAt,
    revision,
    postUri,
    syncStatus,
    mediaRefs,
    lastModified,
    authorDid
  } = article

  return {
    ...(id && { id }),
    ...(title && { title }),
    ...(content && { content }),
    ...(published !== undefined && { published }),
    ...(publishedAt && { publishedAt }),
    ...(revision && { revision }),
    ...(postUri && { postUri }),
    ...(syncStatus && { syncStatus }),
    ...(mediaRefs && { mediaRefs }),
    ...(lastModified && { lastModified }),
    ...(authorDid && { authorDid })
  }
}
