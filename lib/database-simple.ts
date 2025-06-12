import { supabase } from "./supabase"
import type { ContractTransaction } from "./blockchain"
import { fetchArenaUserProfile, postToArenaTimeline } from "./arena-socials"
import { postToDiscordWithRetry } from "./discord-socials"
import { saveContractTransaction } from "./database"

export interface Creator {
  id: string
  wallet_address: string
  contracts_created: number
  contract_tickers: ContractTicker[]
  first_seen_at: string
  last_contract_at: string | null
  created_at: string
  updated_at: string
}

export interface ContractTicker {
  symbol: string
  name?: string
  address?: string
  transaction_hash?: string
  created_at: string
}

// Separate caches for Arena and Discord posts
const arenaPostCache = new Map<string, { posted: boolean; timestamp: number; postType: string }>()
const discordPostCache = new Map<string, { posted: boolean; timestamp: number; postType: string }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 uur cache voor posts

// Helper function to create a unique cache key for Arena posts
function createArenaPostCacheKey(transactionHash: string, walletAddress: string, symbol: string): string {
  return `arena-post-${transactionHash}-${walletAddress.toLowerCase()}-${symbol.toLowerCase()}`
}

// Helper function to create a unique cache key for Discord posts
function createDiscordPostCacheKey(transactionHash: string, walletAddress: string, symbol: string): string {
  return `discord-post-${transactionHash}-${walletAddress.toLowerCase()}-${symbol.toLowerCase()}`
}

// Helper function to check if an Arena post was already sent
function wasArenaPostAlreadySent(cacheKey: string): boolean {
  const cached = arenaPostCache.get(cacheKey)
  if (!cached) return false

  const isValid = Date.now() - cached.timestamp < CACHE_DURATION
  if (!isValid) {
    arenaPostCache.delete(cacheKey)
    return false
  }

  return cached.posted
}

// Helper function to check if a Discord post was already sent
function wasDiscordPostAlreadySent(cacheKey: string): boolean {
  const cached = discordPostCache.get(cacheKey)
  if (!cached) return false

  const isValid = Date.now() - cached.timestamp < CACHE_DURATION
  if (!isValid) {
    discordPostCache.delete(cacheKey)
    return false
  }

  return cached.posted
}

// Helper function to mark an Arena post as sent
function markArenaPostAsSent(cacheKey: string, postType: string): void {
  arenaPostCache.set(cacheKey, {
    posted: true,
    timestamp: Date.now(),
    postType,
  })
  console.log(`📝 Marked Arena post as sent: ${cacheKey} (${postType})`)
}

// Helper function to mark a Discord post as sent
function markDiscordPostAsSent(cacheKey: string, postType: string): void {
  discordPostCache.set(cacheKey, {
    posted: true,
    timestamp: Date.now(),
    postType,
  })
  console.log(`🎮 Marked Discord post as sent: ${cacheKey} (${postType})`)
}

export async function addCreatorContract(
  walletAddress: string,
  symbol: string,
  name?: string,
  address?: string,
  transactionHash?: string,
): Promise<string | null> {
  try {
    // Check if creator exists
    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()

    if (creatorError && creatorError.code !== "PGRST116") {
      console.error("❌ Error fetching creator:", creatorError)
      return null
    }

    if (!creator) {
      // Create new creator
      const { data, error } = await supabase
        .from("creators")
        .insert([
          {
            wallet_address: walletAddress,
            contracts_created: 1,
            contract_tickers: [
              { symbol, name, address, transaction_hash: transactionHash, created_at: new Date().toISOString() },
            ],
            first_seen_at: new Date().toISOString(),
            last_contract_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("❌ Error creating creator:", error)
        return null
      }

      console.log(`✨ New creator added: ${walletAddress}`)
      return data.id
    } else {
      // Update existing creator
      const existingTickers = creator.contract_tickers || []
      const tickerExists = existingTickers.some((ticker) => ticker.symbol === symbol)

      if (!tickerExists) {
        existingTickers.push({
          symbol,
          name,
          address,
          transaction_hash: transactionHash,
          created_at: new Date().toISOString(),
        })
      }

      const { data, error } = await supabase
        .from("creators")
        .update({
          contracts_created: creator.contracts_created + 1,
          contract_tickers: existingTickers,
          last_contract_at: new Date().toISOString(),
        })
        .eq("wallet_address", walletAddress)
        .select()
        .single()

      if (error) {
        console.error("❌ Error updating creator:", error)
        return null
      }

      console.log(`✨ Creator updated: ${walletAddress} - ${creator.contracts_created + 1} contracts`)
      return data.id
    }
  } catch (error) {
    console.error("❌ Error in addCreatorContract:", error)
    return null
  }
}

export async function getCreator(walletAddress: string): Promise<Creator | null> {
  try {
    const { data, error } = await supabase.from("creators").select("*").eq("wallet_address", walletAddress).single()

    if (error) {
      // Check if the error is a "not found" error
      if (error.code === "PGRST116") {
        console.log(`ℹ️ Creator not found: ${walletAddress}`)
        return null
      } else {
        console.error("❌ Error fetching creator:", error)
        return null
      }
    }

    return data
  } catch (error) {
    console.error("❌ Error in getCreator:", error)
    return null
  }
}

// Process a contract transaction and update creator data
export async function processTokenCreation(transaction: ContractTransaction): Promise<string | null> {
  try {
    if (!transaction.isTokenCreation || !transaction.tokenMetadata) {
      console.log("❌ Not a token creation transaction")
      return null
    }

    const { name, symbol, tokenAddress } = transaction.tokenMetadata

    if (!symbol) {
      console.log("❌ No symbol found in token metadata")
      return null
    }

    console.log(`🔄 Processing token creation: ${symbol} by ${transaction.from}`)

    // Create unique cache keys for this specific transaction
    const arenaPostKey = createArenaPostCacheKey(transaction.hash, transaction.from, symbol)
    const discordPostKey = createDiscordPostCacheKey(transaction.hash, transaction.from, symbol)

    // Check database for existing post status
    let arenaAlreadySent = false
    let discordAlreadySent = false
    let transactionId: string | null = null
    const { data: txData, error: txError } = await supabase
      .from("contract_transactions")
      .select("id, posted_to_arena, posted_to_discord")
      .eq("hash", transaction.hash)
      .single()

    if (txError && txError.code !== "PGRST116") {
      console.error("❌ Error fetching transaction status:", txError)
    }

    if (txData) {
      transactionId = txData.id
      arenaAlreadySent = txData.posted_to_arena ?? false
      discordAlreadySent = txData.posted_to_discord ?? false

      if (arenaAlreadySent) markArenaPostAsSent(arenaPostKey, "db")
      if (discordAlreadySent) markDiscordPostAsSent(discordPostKey, "db")
    } else {
      transactionId = await saveContractTransaction(transaction)
    }

    if (arenaAlreadySent && discordAlreadySent) {
      console.log(`⚠️ Both Arena and Discord posts already sent for transaction: ${transaction.hash}`)
      // Still process the database part
      const creatorId = await addCreatorContract(
        transaction.from,
        symbol,
        name || undefined,
        tokenAddress || transaction.tokenAddress || undefined,
        transaction.hash,
      )
      return creatorId
    }

    const creatorId = await addCreatorContract(
      transaction.from,
      symbol,
      name || undefined,
      tokenAddress || transaction.tokenAddress || undefined,
      transaction.hash,
    )

    if (creatorId) {
      console.log(`✅ Token creation processed successfully: ${symbol}`)

      // Get updated creator data to check contract count
      const creatorData = await getCreator(transaction.from)

      if (creatorData && creatorData.contracts_created > 1) {
        console.log(
          `🎯 Creator ${transaction.from} has ${creatorData.contracts_created} tokens - checking Arena profile`,
        )

        // Get Arena profile for this creator
        const arenaProfile = await fetchArenaUserProfile(transaction.from)

        if (arenaProfile && arenaProfile.username) {
          // Enhanced logging for detection
          console.log(`🏆 Creator ${transaction.from} analysis:`)
          console.log(`   - Contracts created: ${creatorData.contracts_created}`)
          console.log(`   - Has Arena profile: ${!!arenaProfile}`)
          console.log(`   - Is Champion: ${arenaProfile.isArenaChampion}`)
          console.log(`   - Username: ${arenaProfile.username}`)
          console.log(`   - Arena followers: ${arenaProfile.followerCount || 0}`)
          console.log(
            `   - Ticket price: ${arenaProfile.keyPrice ? `${Number(arenaProfile.keyPrice) / 1e18} AVAX` : "N/A"}`,
          )
          console.log(`   - Badges: ${arenaProfile.badges?.map((b) => b.badgeType).join(", ") || "none"}`)

          // Determine post type for logging
          let postType = "regular"
          if (arenaProfile.isArenaChampion) {
            postType = "champion"
          } else {
            const followers = arenaProfile.followerCount || 0
            const ticketPrice = arenaProfile.keyPrice ? Number(arenaProfile.keyPrice) / 1e18 : 0
            if (followers >= 5000 || ticketPrice >= 1.5) {
              postType = "heavy-hitter"
            }
          }

          console.log(`📝 Post type determined: ${postType}`)
          console.log(`📝 Cache key: ${arenaPostKey}`)

          // Only post to Arena for champions and heavy hitters (and only if not already sent)
          if ((postType === "champion" || postType === "heavy-hitter") && !arenaAlreadySent) {
            console.log(`🏆 Posting to Arena for ${postType}: @${arenaProfile.username}`)
            const posted = await postToArenaTimeline(
              arenaProfile.username,
              symbol,
              name,
              creatorData.contracts_created,
              arenaProfile.isArenaChampion || false,
              arenaProfile,
            )

            if (posted) {
              markArenaPostAsSent(arenaPostKey, postType)
              if (transactionId) {
                await supabase
                  .from("contract_transactions")
                  .update({ posted_to_arena: true })
                  .eq("id", transactionId)
              }
              console.log(
                `🚀 Successfully posted to Arena timeline for @${arenaProfile.username} (${postType.toUpperCase()})`,
              )
            } else {
              console.log(`⚠️ Failed to post to Arena timeline for @${arenaProfile.username}`)
            }
          } else if (postType === "regular") {
            // Mark regular creators as "sent" for Arena to prevent retries
            markArenaPostAsSent(arenaPostKey, postType)
            console.log(`ℹ️ Regular creator - skipping Arena post for @${arenaProfile.username}`)
          } else if (arenaAlreadySent) {
            console.log(`ℹ️ Arena post already sent for @${arenaProfile.username}`)
          }

          // Post to Discord channels (only if not already sent)
          if (!discordAlreadySent) {
            console.log(`🎮 Attempting Discord post for @${arenaProfile.username}`)
            const discordPosted = await postToDiscordWithRetry(
              arenaProfile.username,
              symbol,
              name,
              creatorData.contracts_created,
              arenaProfile.isArenaChampion || false,
              arenaProfile,
              tokenAddress || transaction.tokenAddress || undefined,
            )

            if (discordPosted) {
              markDiscordPostAsSent(discordPostKey, postType)
              if (transactionId) {
                await supabase
                  .from("contract_transactions")
                  .update({ posted_to_discord: true })
                  .eq("id", transactionId)
              }
              console.log(`🎮 Successfully posted to Discord for @${arenaProfile.username}`)
            } else {
              console.log(`⚠️ Failed to post to Discord for @${arenaProfile.username}`)
            }
          } else {
            console.log(`ℹ️ Discord post already sent for @${arenaProfile.username}`)
          }
        } else {
          console.log(`⚠️ No Arena profile found for creator ${transaction.from}`)
        }
      } else {
        console.log(
          `ℹ️ Creator ${transaction.from} has only ${creatorData?.contracts_created || 0} token(s) - skipping Arena post`,
        )
      }
    }

    return creatorId
  } catch (error) {
    console.error("❌ Error processing token creation:", error)
    return null
  }
}

// Get all creators with their stats
export async function getCreators(limit = 50): Promise<Creator[]> {
  try {
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .order("contracts_created", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("❌ Error fetching creators:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("❌ Error in getCreators:", error)
    return []
  }
}

// Get top creators by contract count
export async function getTopCreators(limit = 10): Promise<Creator[]> {
  try {
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .order("contracts_created", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("❌ Error fetching top creators:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("❌ Error in getTopCreators:", error)
    return []
  }
}

// Get creator statistics
export async function getCreatorStats(): Promise<{
  totalCreators: number
  totalContracts: number
  avgContractsPerCreator: number
  newCreatorsLast24h: number
  newContractsLast24h: number
}> {
  try {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get total creators
    const { count: totalCreators } = await supabase.from("creators").select("*", { count: "exact", head: true })

    // Get total contracts (sum of all contracts_created)
    const { data: contractsData } = await supabase.from("creators").select("contracts_created")

    const totalContracts = contractsData?.reduce((sum, creator) => sum + creator.contracts_created, 0) || 0
    const avgContractsPerCreator = totalCreators ? Math.round((totalContracts / totalCreators) * 100) / 100 : 0

    // Get new creators in last 24h
    const { count: newCreatorsLast24h } = await supabase
      .from("creators")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", oneDayAgo.toISOString())

    // Get new contracts in last 24h
    const { count: newContractsLast24h } = await supabase
      .from("creators")
      .select("*", { count: "exact", head: true })
      .gte("last_contract_at", oneDayAgo.toISOString())

    return {
      totalCreators: totalCreators || 0,
      totalContracts,
      avgContractsPerCreator,
      newCreatorsLast24h: newCreatorsLast24h || 0,
      newContractsLast24h: newContractsLast24h || 0,
    }
  } catch (error) {
    console.error("❌ Error in getCreatorStats:", error)
    return {
      totalCreators: 0,
      totalContracts: 0,
      avgContractsPerCreator: 0,
      newCreatorsLast24h: 0,
      newContractsLast24h: 0,
    }
  }
}

// Test database connection
export async function testCreatorsTable(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("creators").select("count").limit(1)

    if (error) {
      console.error("❌ Creators table test failed:", error)
      return false
    }

    console.log("✅ Creators table connection successful")
    return true
  } catch (error) {
    console.error("❌ Creators table test error:", error)
    return false
  }
}

// Debug functie om cache status te bekijken
export function getPostCacheStatus(): {
  arena: {
    size: number
    entries: Array<{ key: string; posted: boolean; timestamp: string; postType: string; age: string }>
  }
  discord: {
    size: number
    entries: Array<{ key: string; posted: boolean; timestamp: string; postType: string; age: string }>
  }
} {
  const arenaEntries = Array.from(arenaPostCache.entries()).map(([key, value]) => ({
    key,
    posted: value.posted,
    timestamp: new Date(value.timestamp).toISOString(),
    postType: value.postType,
    age: `${Math.round((Date.now() - value.timestamp) / 1000 / 60)} minutes ago`,
  }))

  const discordEntries = Array.from(discordPostCache.entries()).map(([key, value]) => ({
    key,
    posted: value.posted,
    timestamp: new Date(value.timestamp).toISOString(),
    postType: value.postType,
    age: `${Math.round((Date.now() - value.timestamp) / 1000 / 60)} minutes ago`,
  }))

  return {
    arena: { size: arenaPostCache.size, entries: arenaEntries },
    discord: { size: discordPostCache.size, entries: discordEntries },
  }
}

// Clear post caches
export function clearPostCaches(): void {
  console.log(`Clearing Arena post cache (${arenaPostCache.size} entries)`)
  console.log(`Clearing Discord post cache (${discordPostCache.size} entries)`)
  arenaPostCache.clear()
  discordPostCache.clear()
}

// Clean expired cache entries
export function cleanExpiredArenaPostCache(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [key, value] of arenaPostCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      arenaPostCache.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired Arena post cache entries`)
  }

  return cleaned
}
