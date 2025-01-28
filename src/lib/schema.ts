import { AtpAgent } from '@atproto/api'

export class SchemaService {
  private agent: AtpAgent
  private did: string | null = null

  constructor(service = 'https://bsky.social') {
    this.agent = new AtpAgent({ service })
  }

  setAuth(jwt: string, did: string) {
    this.agent.setHeader('Authorization', `Bearer ${jwt}`)
    this.did = did
    console.log('Auth state:', { did, hasAuth: !!jwt })
  }

  async checkNamespace(): Promise<boolean> {
    if (!this.did) throw new Error('Not authenticated')
    
    try {
      console.log('Checking namespace:', { did: this.did })
      const result = await this.agent.com.atproto.repo.getRecord({
        collection: 'com.atproto.repo.defs',
        repo: this.did,
        rkey: 'org.openpds.defs'
      })
      return result.success
    } catch (err) {
      console.log('Namespace check failed:', err.message)
      return false
    }
  }

  async registerSchemas(): Promise<void> {
    if (!this.did) throw new Error('Not authenticated')
    
    console.log('Starting schema registration:', { did: this.did })
    
    try {
      await this.agent.com.atproto.repo.createRecord({
        collection: 'com.atproto.repo.defs',
        repo: this.did,
        record: {
          lexicon: 1,
          id: 'org.openpds.defs',
          revision: 1,
          description: 'OpenPDS Schema Definitions'
        }
      })
      console.log('Namespace registered')

      await this.agent.com.atproto.repo.createRecord({
        collection: 'org.openpds.defs',
        repo: this.did,
        record: {
          lexicon: 1,
          id: 'org.openpds.article',
          defs: {
            article: {
              type: 'record',
              key: 'tid',
              record: {
                type: 'object',
                required: ['text', 'title'],
                properties: {
                  title: { type: 'string' },
                  text: { type: 'string' },
                  media: { 
                    type: 'array',
                    items: { type: 'blob' }
                  },
                  publishedAt: { type: 'datetime' }
                }
              }
            }
          }
        }
      })
      console.log('Article schema registered')
    } catch (err) {
      console.error('Registration failed:', err)
      throw err
    }
  }
}