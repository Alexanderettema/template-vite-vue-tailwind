import { createClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'set' : 'missing',
    key: supabaseAnonKey ? 'set' : 'missing'
  })
  throw new Error('Missing required Supabase configuration')
}

console.log('Initializing Supabase client with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Test the connection immediately
void supabase.from('sessions').select('count').limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('Error connecting to Supabase:', error)
    } else {
      console.log('Successfully connected to Supabase sessions table')
    }
  })
  .catch((error: PostgrestError | Error) => {
    console.error('Failed to connect to Supabase:', error)
  })

// Type definitions for our database
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          duration: number
          insights: string[]
          summary: string | null
          is_archived?: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          duration?: number
          insights?: string[]
          summary?: string | null
          is_archived?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          duration?: number
          insights?: string[]
          summary?: string | null
          is_archived?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          essence?: string
          timestamp: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          essence?: string
          timestamp?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          essence?: string
          timestamp?: string
        }
      }
    }
  }
} 