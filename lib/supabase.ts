import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Initialize the Supabase client using validated env variables
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a singleton instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

// Test the Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("creators").select("count").limit(1)

    if (error) {
      console.error("Supabase connection test failed:", error)
      return false
    }

    console.log("Supabase connection successful")
    return true
  } catch (error) {
    console.error("Supabase connection error:", error)
    return false
  }
}

// Database types
export interface Database {
  public: {
    Tables: {
      tokens: {
        Row: {
          id: string
          address: string
          creator_address: string
          name: string | null
          symbol: string | null
          total_supply: number | null
          transaction_hash: string
          block_number: number
          timestamp: string
          method_id: string | null
          method_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          address: string
          creator_address: string
          name?: string | null
          symbol?: string | null
          total_supply?: number | null
          transaction_hash: string
          block_number: number
          timestamp: string
          method_id?: string | null
          method_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          address?: string
          creator_address?: string
          name?: string | null
          symbol?: string | null
          total_supply?: number | null
          transaction_hash?: string
          block_number?: number
          timestamp?: string
          method_id?: string | null
          method_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      creator_profiles: {
        Row: {
          id: string
          wallet_address: string
          username: string | null
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          twitter_handle: string | null
          telegram_handle: string | null
          website_url: string | null
          verified: boolean
          follower_count: number
          following_count: number
          token_count: number
          key_price: number
          total_holders: number
          volume: number
          supply: number
          joined_at: string | null
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          username?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          twitter_handle?: string | null
          telegram_handle?: string | null
          website_url?: string | null
          verified?: boolean
          follower_count?: number
          following_count?: number
          token_count?: number
          key_price?: number
          total_holders?: number
          volume?: number
          supply?: number
          joined_at?: string | null
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          username?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          twitter_handle?: string | null
          telegram_handle?: string | null
          website_url?: string | null
          verified?: boolean
          follower_count?: number
          following_count?: number
          token_count?: number
          key_price?: number
          total_holders?: number
          volume?: number
          supply?: number
          joined_at?: string | null
          last_updated?: string
          created_at?: string
        }
      }
      contract_transactions: {
        Row: {
          id: string
          hash: string
          from_address: string
          to_address: string | null
          value_wei: number
          block_number: number
          timestamp: string
          method_id: string | null
          method_name: string | null
          transaction_type: string
          description: string | null
          gas_used: number | null
          gas_price: number | null
          status: string
          token_id: string | null
          creator_profile_id: string | null
          raw_input: string | null
          created_at: string
        }
        Insert: {
          id?: string
          hash: string
          from_address: string
          to_address?: string | null
          value_wei?: number
          block_number: number
          timestamp: string
          method_id?: string | null
          method_name?: string | null
          transaction_type: string
          description?: string | null
          gas_used?: number | null
          gas_price?: number | null
          status?: string
          token_id?: string | null
          creator_profile_id?: string | null
          raw_input?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          hash?: string
          from_address?: string
          to_address?: string | null
          value_wei?: number
          block_number?: number
          timestamp?: string
          method_id?: string | null
          method_name?: string | null
          transaction_type?: string
          description?: string | null
          gas_used?: number | null
          gas_price?: number | null
          status?: string
          token_id?: string | null
          creator_profile_id?: string | null
          raw_input?: string | null
          created_at?: string
        }
      }
    }
  }
}
