import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

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