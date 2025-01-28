import { getDB } from '@/db'
import type { Session } from '@/types'

export class SessionManager {
  async saveSession(session: Session): Promise<void> {
    const db = await getDB()
    await db.put('sessions', {
      did: session.did,
      handle: session.handle,
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      expires: session.expires,
      deviceId: crypto.randomUUID(),
      lastActive: new Date()
    })
  }

  async getSessions(): Promise<Session[]> {
    const db = await getDB()
    const sessions = await db.getAll('sessions')
    return sessions.filter(session => new Date(session.expires) > new Date())
  }

  async cleanup(): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('sessions', 'readwrite')
    const sessions = await tx.store.getAll()

    for (const session of sessions) {
      if (new Date(session.expires) <= new Date()) {
        await tx.store.delete(session.did)
      }
    }

    await tx.done
  }
}