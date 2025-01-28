import { AuthManager } from '@/lib/auth'
import { SchemaService } from '@/lib/schema'
import { defineStore } from 'pinia'
import type { Session } from '@/types'

const auth = new AuthManager()
const schemaService = new SchemaService()

interface AuthState {
  session: Session | null
  loading: boolean
  error: Error | null
  needsSchemaSetup: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    session: null,
    loading: false,
    error: null,
    needsSchemaSetup: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.session && state.session.expires > new Date()
  },

  actions: {
    async init() {
      this.loading = true
      try {
        this.session = await auth.getActiveSession()
        if (this.session?.accessJwt) {
          schemaService.setAuth(this.session.accessJwt, this.session.did)
          // Delay schema check until we're sure we have a valid session
          await this.checkSchemas()
        }
      } catch (err) {
        this.error = err as Error
      } finally {
        this.loading = false
      }
    },

    async checkSchemas() {
      if (!this.session?.accessJwt) return
      this.needsSchemaSetup = !(await schemaService.checkNamespace())
    },

    async login(handle: string, password: string) {
      this.loading = true
      try {
        this.session = await auth.login(handle, password)
        schemaService.setAuth(this.session.accessJwt, this.session.did)
        this.needsSchemaSetup = !(await schemaService.checkNamespace())
      } catch (err) {
        this.error = err as Error
        throw err
      } finally {
        this.loading = false
      }
    },

    async setupSchemas() {
      if (!this.session) throw new Error('Not authenticated')
      
      try {
        await schemaService.registerSchemas()
        this.needsSchemaSetup = false
      } catch (err) {
        this.error = err as Error
        throw err
      }
    },

    async refresh() {
      try {
        const refreshedSession = await auth.refresh()
        if (refreshedSession) {
          this.session = refreshedSession
          schemaService.setAuth(refreshedSession.accessJwt, refreshedSession.did)
        }
      } catch (err) {
        this.error = err as Error
        this.session = null
        throw err
      }
    },

    async logout() {
      try {
        await auth.logout()
        this.session = null
        this.error = null
        this.needsSchemaSetup = false
      } catch (err) {
        this.error = err as Error
        throw err
      }
    },

    clearError() {
      this.error = null
    }
  }
})