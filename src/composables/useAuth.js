import { ref } from 'vue'
import { supabase } from '../lib/supabase'

// Module-level singleton — shared across all callers
const currentUser = ref(null)

// Hydrate from existing session on first import
supabase.auth.getSession().then(({ data: { session } }) => {
  currentUser.value = session?.user ?? null
})

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser.value = session?.user ?? null
})

// Refresh session when user returns to a backgrounded tab
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && currentUser.value) {
        currentUser.value = null
      }
    }
  })
}

export function useAuth() {
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signInWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password, captchaToken) {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        captchaToken
      }
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { currentUser, signInWithGoogle, signInWithEmail, signUp, signOut }
}
