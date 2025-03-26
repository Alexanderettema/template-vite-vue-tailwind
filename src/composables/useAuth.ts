import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Initialize user on mount
  const initUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    user.value = currentUser
  }

  // Sign up with email
  const signUp = async (email: string, password: string) => {
    try {
      loading.value = true
      error.value = null
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) throw signUpError
      return { data, error: null }
    } catch (e) {
      error.value = (e as Error).message
      return { data: null, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Sign in with email
  const signIn = async (email: string, password: string) => {
    try {
      loading.value = true
      error.value = null
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      user.value = data.user
      return { data, error: null }
    } catch (e) {
      error.value = (e as Error).message
      return { data: null, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      loading.value = true
      error.value = null
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      if (signInError) throw signInError
      return { data, error: null }
    } catch (e) {
      error.value = (e as Error).message
      return { data: null, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      console.log('Starting signOut process...')
      loading.value = true
      error.value = null
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error('SignOut error:', signOutError)
        throw signOutError
      }
      console.log('SignOut successful')
      user.value = null
    } catch (e) {
      console.error('SignOut error:', e)
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      loading.value = true
      error.value = null
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
      return { error: null }
    } catch (e) {
      error.value = (e as Error).message
      return { error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Update password
  const updatePassword = async (newPassword: string) => {
    try {
      loading.value = true
      error.value = null
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError
      return { error: null }
    } catch (e) {
      error.value = (e as Error).message
      return { error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Listen to auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user ?? null
  })

  return {
    user,
    loading,
    error,
    initUser,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
  }
} 