import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          user_id: string
          created_at: string
          summary: string | null
          selected_topics: string[]
          is_archived: boolean
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          summary?: string | null
          selected_topics?: string[]
          is_archived?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          summary?: string | null
          selected_topics?: string[]
          is_archived?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          essence: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          essence?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          essence?: string[] | null
          created_at?: string
        }
      }
    }
  }
} 