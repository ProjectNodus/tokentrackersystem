import { supabase, type Database } from "./supabase"
import type { ContractTransaction, TokenData } from "./blockchain"
import type { ArenaUserProfile } from "./arena-socials"

type TokenRow = Database["public"]["Tables"]["tokens"]["Row"]
type TokenInsert = Database["public"]["Tables"]["tokens"]["Insert"]
type CreatorProfileRow = Database["public"]["Tables"]["creator_profiles"]["Row"]
type CreatorProfileInsert = Database["public"]["Tables"]["creator_profiles"]["Insert"]
type ContractTransactionRow = Database["public"]["Tables"]["contract_transactions"]["Row"]
type ContractTransactionInsert = Database["public"]["Tables"]["contract_transactions"]["Insert"]

// Token database operations
export async function saveToken(tokenData: TokenData): Promise<string | null> {
  try {
    console.log(`💾 Saving token to database:`, tokenData)

    const tokenInsert: TokenInsert = {
      address: tokenData.address!,
      creator_address: tokenData.creator!,
      name: tokenData.name || null,
      symbol: tokenData.symbol || null,
      total_supply: tokenData.totalSupply ? Number(tokenData.totalSupply) : null,
      transaction_hash: tokenData.hash!,
      block_number: Number(tokenData.blockNumber!),
      timestamp: new Date(tokenData.timestamp!).toISOString(),
      method_id: null, // We can add this later if needed
      method_name: null,
    }

    const { data, error } = await supabase
      .from("tokens")
      .upsert(tokenInsert, {
        onConflict: "address",
        ignoreDuplicates: false,
      })
      .select("id")
      .single()

    if (error) {
      console.error("❌ Error saving token:", error)
      return null
    }

    console.log(`✅ Token saved with ID: ${data.id}`)
    return data.id
  } catch (error) {
    console.error("❌ Error in saveToken:", error)
    return null
  }
}

// Creator profile database operations
export async function saveCreatorProfile(
  walletAddress: string,
  arenaProfile: ArenaUserProfile,
): Promise<string | null> {
  try {
    console.log(`💾 Saving creator profile to database:`, { walletAddress, arenaProfile })

    const profileInsert: CreatorProfileInsert = {
      wallet_address: walletAddress.toLowerCase(),
      username: arenaProfile.username || null,
      display_name: arenaProfile.displayName || null,
      bio: arenaProfile.bio || null,
      avatar_url: arenaProfile.avatar || null,
      twitter_handle: arenaProfile.twitter || null,
      telegram_handle: arenaProfile.telegram || null,
      website_url: arenaProfile.website || null,
      verified: arenaProfile.verified || false,
      follower_count: arenaProfile.followerCount || 0,
      following_count: arenaProfile.followingCount || 0,
      token_count: arenaProfile.tokenCount || 0,
      key_price: arenaProfile.keyPrice ? Number(arenaProfile.keyPrice) : 0,
      total_holders: arenaProfile.totalHolders ? Number(arenaProfile.totalHolders) : 0,
      volume: arenaProfile.volume ? Number(arenaProfile.volume) : 0,
      supply: arenaProfile.supply || 0,
      joined_at: arenaProfile.joinedAt ? new Date(arenaProfile.joinedAt).toISOString() : null,
      last_updated: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("creator_profiles")
      .upsert(profileInsert, {
        onConflict: "wallet_address",
        ignoreDuplicates: false,
      })
      .select("id")
      .single()

    if (error) {
      console.error("❌ Error saving creator profile:", error)
      return null
    }

    console.log(`✅ Creator profile saved with ID: ${data.id}`)
    return data.id
  } catch (error) {
    console.error("❌ Error in saveCreatorProfile:", error)
    return null
  }
}

// Contract transaction database operations
export async function saveContractTransaction(
  transaction: ContractTransaction,
  tokenId?: string | null,
  creatorProfileId?: string | null,
): Promise<string | null> {
  try {
    console.log(`💾 Saving contract transaction to database:`, transaction)

    const transactionInsert: ContractTransactionInsert = {
      hash: transaction.hash,
      from_address: transaction.from,
      to_address: transaction.to || null,
      value_wei: Number(transaction.value),
      block_number: Number(transaction.blockNumber),
      timestamp: new Date(transaction.timestamp!).toISOString(),
      method_id: transaction.methodId || null,
      method_name: transaction.method || null,
      transaction_type: transaction.transactionType,
      description: transaction.description || null,
      gas_used: null, // We can add this from receipt if needed
      gas_price: null,
      status: "success", // Default to success, can be updated
      token_id: tokenId || null,
      creator_profile_id: creatorProfileId || null,
      raw_input: transaction.rawInput || null,
    }

    const { data, error } = await supabase
      .from("contract_transactions")
      .upsert(transactionInsert, {
        onConflict: "hash",
        ignoreDuplicates: false,
      })
      .select("id")
      .single()

    if (error) {
      console.error("❌ Error saving contract transaction:", error)
      return null
    }

    console.log(`✅ Contract transaction saved with ID: ${data.id}`)
    return data.id
  } catch (error) {
    console.error("❌ Error in saveContractTransaction:", error)
    return null
  }
}

// Fetch operations
export async function getTokens(limit = 50): Promise<TokenRow[]> {
  try {
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("❌ Error fetching tokens:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("❌ Error in getTokens:", error)
    return []
  }
}

export async function getCreatorProfile(walletAddress: string): Promise<CreatorProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null
      }
      console.error("❌ Error fetching creator profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("❌ Error in getCreatorProfile:", error)
    return null
  }
}

export async function getContractTransactions(limit = 50, transactionType?: string): Promise<ContractTransactionRow[]> {
  try {
    let query = supabase.from("contract_transactions").select("*").order("timestamp", { ascending: false }).limit(limit)

    if (transactionType) {
      query = query.eq("transaction_type", transactionType)
    }

    const { data, error } = await query

    if (error) {
      console.error("❌ Error fetching contract transactions:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("❌ Error in getContractTransactions:", error)
    return []
  }
}

// Analytics functions
export async function getTokenStats(): Promise<{
  total: number
  last24h: number
  last7d: number
  avgSupply: number
}> {
  try {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get total count
    const { count: total } = await supabase.from("tokens").select("*", { count: "exact", head: true })

    // Get 24h count
    const { count: last24h } = await supabase
      .from("tokens")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", oneDayAgo.toISOString())

    // Get 7d count
    const { count: last7d } = await supabase
      .from("tokens")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", oneWeekAgo.toISOString())

    // Get average supply
    const { data: avgData } = await supabase.from("tokens").select("total_supply").not("total_supply", "is", null)

    const avgSupply =
      avgData && avgData.length > 0
        ? avgData.reduce((sum, token) => sum + (token.total_supply || 0), 0) / avgData.length
        : 0

    return {
      total: total || 0,
      last24h: last24h || 0,
      last7d: last7d || 0,
      avgSupply: Math.round(avgSupply),
    }
  } catch (error) {
    console.error("❌ Error in getTokenStats:", error)
    return { total: 0, last24h: 0, last7d: 0, avgSupply: 0 }
  }
}

// Enhanced save function that handles the complete flow
export async function saveCompleteTokenCreation(
  transaction: ContractTransaction,
  arenaProfile?: ArenaUserProfile | null,
): Promise<{ tokenId: string | null; profileId: string | null; transactionId: string | null }> {
  try {
    console.log(`💾 Saving complete token creation flow for transaction: ${transaction.hash}`)

    let tokenId: string | null = null
    let profileId: string | null = null
    let transactionId: string | null = null

    // 1. Save token if it's a token creation
    if (transaction.isTokenCreation && transaction.tokenMetadata) {
      const tokenData: TokenData = {
        address: transaction.tokenMetadata.tokenAddress || transaction.tokenAddress,
        creator: transaction.from,
        name: transaction.tokenMetadata.name,
        symbol: transaction.tokenMetadata.symbol,
        totalSupply: transaction.tokenMetadata.totalSupply,
        timestamp: transaction.timestamp,
        blockNumber: transaction.blockNumber,
        hash: transaction.hash,
        isPending: false,
      }

      if (tokenData.address) {
        tokenId = await saveToken(tokenData)
      }
    }

    // 2. Save creator profile if available
    if (arenaProfile) {
      profileId = await saveCreatorProfile(transaction.from, arenaProfile)
    }

    // 3. Save contract transaction
    transactionId = await saveContractTransaction(transaction, tokenId, profileId)

    console.log(`✅ Complete token creation saved:`, { tokenId, profileId, transactionId })

    return { tokenId, profileId, transactionId }
  } catch (error) {
    console.error("❌ Error in saveCompleteTokenCreation:", error)
    return { tokenId: null, profileId: null, transactionId: null }
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("tokens").select("count").limit(1)

    if (error) {
      console.error("❌ Database connection test failed:", error)
      return false
    }

    console.log("✅ Database connection successful")
    return true
  } catch (error) {
    console.error("❌ Database connection test error:", error)
    return false
  }
}
