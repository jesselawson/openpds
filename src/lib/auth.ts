import { AtpAgent } from '@atproto/api'
import type { Session } from '@/types'
import { getDB } from '@/db'
import { getDeviceId } from './device'

const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_ATTEMPTS = 5

export class AuthManager {
  private agent = new AtpAgent({ service: 'https://bsky.social' })
  private lastAttempt = 0
  private attempts = 0

  private checkRateLimit() {
    const now = Date.now()
    if (now - this.lastAttempt < RATE_LIMIT_WINDOW) {
      this.attempts++
      if (this.attempts > MAX_ATTEMPTS) {
        throw new Error('Rate limit exceeded')
      }
    } else {
      this.attempts = 1
    }
    this.lastAttempt = now
  }

  async login(handle: string, password: string): Promise<Session> {
    this.checkRateLimit()
    
    try {
      const { data } = await this.agent.login({ 
        identifier: handle, 
        password, 
        allowTakendown: false 
      })
      
      const session = await this.saveSession(data)
      return session
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Authentication')) {
          throw new Error('Invalid credentials')
        }
        if (err.message.includes('network')) {
          throw new Error('Network error - please check your connection')
        }
      }
      throw err
    }
  }

  async refresh(): Promise<Session> {
    this.checkRateLimit()
    
    const currentSession = await this.getActiveSession()
    if (!currentSession) throw new Error('No active session')

    try {
      const { data } = await this.agent.com.atproto.server.refreshSession()
      const session = await this.saveSession(data)
      return session
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Invalid token')) {
          await this.logout()
          throw new Error('Session expired')
        }
      }
      throw err
    }
  }

  private async saveSession(data: any): Promise<Session> {
    const session: Session = {
      did: data.did,
      handle: data.handle,
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      deviceId: await getDeviceId(),
      lastActive: new Date()
    }

    const db = await getDB()
    await db.put('sessions', session)
    return session
  }

  async logout(): Promise<void> {
    const db = await getDB()
    await db.clear('sessions')
  }

  async getActiveSession(): Promise<Session | null> {
    const db = await getDB()
    const sessions = await db.getAll('sessions')
    const session = sessions[0]
  
    if (!session) return null
    
    // Refresh if token expires soon
    if (session.expires.getTime() - Date.now() < 5 * 60 * 1000) {
      try {
        return await this.refresh()
      } catch {
        await this.logout()
        return null
      }
    }
  
    return session
  }
}