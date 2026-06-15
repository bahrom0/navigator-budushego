import { create } from "zustand"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export type { User as AuthUser }

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  hydrate: () => void
  login: (email: string, password: string) => Promise<{ error: string | null }>
  signup: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  let initialized = false

  return {
    isAuthenticated: false,
    user: null,
    isLoading: true,

    hydrate: () => {
      if (initialized) return
      initialized = true

      const supabase = createClient()

      supabase.auth.getSession().then(({ data: { session } }) => {
        set({
          isAuthenticated: !!session,
          user: session?.user ?? null,
          isLoading: false,
        })
      })

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          isAuthenticated: !!session,
          user: session?.user ?? null,
          isLoading: false,
        })
      })
    },

    login: async (email, password) => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },

    signup: async (email, password) => {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error?.message ?? null }
    },

    signInWithGoogle: async () => {
      const supabase = createClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      })
      if (error) {
        console.error("Google sign-in error:", error.message)
        throw error
      }
    },

    logout: async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      set({ isAuthenticated: false, user: null })
    },
  }
})
