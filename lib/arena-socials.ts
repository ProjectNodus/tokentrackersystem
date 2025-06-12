export interface ArenaUserProfile {
  username?: string
  displayName?: string
  bio?: string
  avatar?: string
  twitter?: string
  telegram?: string
  website?: string
  verified?: boolean
  followerCount?: number // Arena followers
  twitterFollowerCount?: number // Twitter/X followers
  followingCount?: number
  tokenCount?: number
  joinedAt?: string
  keyPrice?: string // Added ticket value
  totalHolders?: string // Added total holders
  volume?: string // Added volume
  supply?: number // Added supply
  badges?: ArenaBadge[] // Added badges array
  isArenaChampion?: boolean // Helper flag for Arena Champion status
}

// New interface for Arena badges
export interface ArenaBadge {
  id: number
  userId: string
  badgeType: number
  order: number
}

// Cache voor gebruikersprofielen om API calls te beperken
const userProfileCache = new Map<string, { profile: ArenaUserProfile | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minuten cache

// Retry utility function
export async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`)

      // Increase timeout for each retry
      const timeoutMs = 10000 + attempt * 2000 // 10s, 12s, 14s
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`✅ Success on attempt ${attempt} for ${url}`)
        return response
      } else {
        console.warn(`❌ HTTP ${response.status} on attempt ${attempt} for ${url}`)
        if (response.status === 404) {
          // Don't retry 404s
          return response
        }
      }
    } catch (error) {
      lastError = error as Error
      console.warn(`❌ Attempt ${attempt} failed for ${url}:`, error)

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000)
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries} attempts`)
}

// Enhanced fetchArenaUserProfile with better Champion detection
export async function fetchArenaUserProfile(walletAddress: string): Promise<ArenaUserProfile | null> {
  try {
    // Check cache first
    const cached = userProfileCache.get(walletAddress.toLowerCase())
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached profile for ${walletAddress}`)
      return cached.profile
    }

    console.log(`🔍 Fetching Arena profile for ${walletAddress}`)

    let profile: ArenaUserProfile | null = null
    let handle: string | null = null
    let userId: string | null = null

    // STEP 1: Get handle from arena.trade
    try {
      const arenaTradeEndpoint = `https://api.arena.trade/user_info?user_address=eq.${walletAddress}`
      console.log(`📡 Step 1: Getting handle from arena.trade: ${arenaTradeEndpoint}`)

      const headers: HeadersInit = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      }

      if (process.env.ARENA_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.ARENA_API_KEY}`
      }

      const response = await fetchWithRetry(arenaTradeEndpoint, { method: "GET", headers }, 2)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Arena.trade response:`, data)

        if (Array.isArray(data) && data.length > 0) {
          const userData = data[0]
          handle = userData.twitter_handle || userData.twitter_handle_lc || userData.handle

          // Create initial profile from arena.trade data
          profile = normalizeArenaTradeArrayResponse(userData)

          console.log(`✅ Found handle: "${handle}" for ${walletAddress}`)
        } else {
          console.log(`❌ No user data found in arena.trade for ${walletAddress}`)
        }
      } else {
        console.log(`❌ Arena.trade returned ${response.status} for ${walletAddress}`)
      }
    } catch (error) {
      console.error(`❌ Failed to fetch from arena.trade:`, error)
    }

    // STEP 2: If we have a handle, get userId from StarsArena
    if (handle) {
      try {
        const starsArenaUserEndpoint = `https://api.starsarena.com/user/handle?handle=${handle}`
        console.log(`📡 Step 2: Getting userId from StarsArena: ${starsArenaUserEndpoint}`)

        const headers: HeadersInit = {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          Origin: "https://arena.social",
          Referer: "https://arena.social/",
        }

        // Try without auth first (this endpoint might be public)
        const response = await fetchWithRetry(starsArenaUserEndpoint, { method: "GET", headers }, 2)

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ StarsArena user response:`, data)

          if (data && data.user && data.user.id) {
            userId = data.user.id
            console.log(`✅ Found userId: "${userId}" for handle: "${handle}"`)

            // Enhance profile with StarsArena user data
            if (!profile) {
              profile = {
                username: handle,
                displayName: data.user.twitterName || data.user.handle,
              }
            }

            // Update profile with additional StarsArena user data
            if (data.user.twitterName) profile.displayName = data.user.twitterName
            if (data.user.twitterDescription) profile.bio = data.user.twitterDescription
            if (data.user.twitterPicture || data.user.lastLoginTwitterPicture) {
              profile.avatar = data.user.twitterPicture || data.user.lastLoginTwitterPicture
            }
            if (data.user.twitterHandle) profile.twitter = data.user.twitterHandle
            if (data.user.twitterConfirmed) profile.verified = data.user.twitterConfirmed

            // Set Arena follower count (this is Arena-specific)
            if (data.user.followerCount) {
              profile.followerCount = data.user.followerCount
              console.log(`👥 Arena followers: ${profile.followerCount}`)
            }

            // Set Twitter follower count (this comes from Twitter data)
            if (data.user.twitterFollowerCount) {
              profile.twitterFollowerCount = data.user.twitterFollowerCount
              console.log(`🐦 Twitter followers: ${profile.twitterFollowerCount}`)
            }

            if (data.user.followingsCount) profile.followingCount = data.user.followingsCount
            if (data.user.threadCount) profile.tokenCount = data.user.threadCount
            if (data.user.createdOn) profile.joinedAt = data.user.createdOn

            // Extract some basic stats from user data
            if (data.user.keyPrice) {
              profile.keyPrice = data.user.keyPrice
              console.log(`💰 Found keyPrice in user data: ${formatAvaxValue(data.user.keyPrice)} AVAX`)
            }
            if (data.user.lastKeyPrice) {
              profile.keyPrice = data.user.lastKeyPrice
              console.log(`💰 Found lastKeyPrice in user data: ${formatAvaxValue(data.user.lastKeyPrice)} AVAX`)
            }
          } else {
            console.log(`❌ No user ID found in StarsArena response for handle: "${handle}"`)
          }
        } else {
          const errorText = await response.text().catch(() => "Unable to read error")
          console.log(`❌ StarsArena user endpoint returned ${response.status}: ${errorText.substring(0, 200)}`)
        }
      } catch (error) {
        console.error(`❌ Failed to fetch user from StarsArena:`, error)
      }
    }

    // STEP 3: If we have userId, get detailed stats from StarsArena
    if (userId) {
      try {
        const starsArenaStatsEndpoint = `https://api.starsarena.com/shares/stats?userId=${userId}`
        console.log(`📡 Step 3: Getting stats from StarsArena: ${starsArenaStatsEndpoint}`)

        const headers: HeadersInit = {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          Origin: "https://arena.social",
          Referer: "https://arena.social/",
        }

        // Try without auth first
        const response = await fetchWithRetry(starsArenaStatsEndpoint, { method: "GET", headers }, 2)

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ StarsArena stats response for ${handle}:`, JSON.stringify(data, null, 2))

          if (!profile) {
            profile = {
              username: handle || userId,
              displayName: handle || userId,
            }
          }

          // Extract stats from the response
          if (data.totalHolders !== undefined) {
            profile.totalHolders = data.totalHolders.toString()
            console.log(`👥 Total holders: ${profile.totalHolders}`)
          }

          if (data.stats) {
            if (data.stats.keyPrice !== undefined) {
              profile.keyPrice = data.stats.keyPrice.toString()
              console.log(`💰 Key price: ${formatAvaxValue(profile.keyPrice)} AVAX`)
            }

            if (data.stats.volume !== undefined) {
              profile.volume = data.stats.volume.toString()
              console.log(`📊 Volume: ${formatAvaxValue(profile.volume)} AVAX`)
            }

            if (data.stats.supply !== undefined) {
              profile.supply = Number(data.stats.supply)
              console.log(`🎫 Supply: ${profile.supply}`)
            }

            // Log additional stats for debugging
            console.log(`📈 Additional stats found:`, {
              buys: data.stats.buys,
              sells: data.stats.sells,
              feesPaid: data.stats.feesPaid,
              feesEarned: data.stats.feesEarned,
            })
          }

          // CRITICAL: Enhanced badge detection with extensive logging
          console.log(`🏆 === BADGE DETECTION DEBUG START ===`)
          console.log(`🏆 Raw badges data:`, data.badges)
          console.log(`🏆 Badges type:`, typeof data.badges)
          console.log(`🏆 Is array:`, Array.isArray(data.badges))

          if (data.badges && Array.isArray(data.badges)) {
            console.log(`🏆 Found ${data.badges.length} badges in response`)

            // Log each badge individually
            data.badges.forEach((badge: any, index: number) => {
              console.log(`🏆 Badge ${index + 1}:`, {
                id: badge.id,
                userId: badge.userId,
                badgeType: badge.badgeType,
                order: badge.order,
                rawBadge: badge,
              })
            })

            profile.badges = data.badges

            // Multiple ways to check for Arena Champion badge (type 19)
            const championBadge = data.badges.find((badge: any) => {
              console.log(`🏆 Checking badge: badgeType=${badge.badgeType}, type=${typeof badge.badgeType}`)
              return badge.badgeType === 19 || badge.badgeType === "19" || Number(badge.badgeType) === 19
            })

            // Also check with loose comparison
            const championBadgeLoose = data.badges.find((badge: any) => String(badge.badgeType) === "19")

            console.log(`🏆 Champion badge (strict):`, championBadge)
            console.log(`🏆 Champion badge (loose):`, championBadgeLoose)

            // Set champion status
            profile.isArenaChampion = !!(championBadge || championBadgeLoose)

            console.log(
              `🏆 All badge types found:`,
              data.badges.map((b: any) => `${b.badgeType} (${typeof b.badgeType})`).join(", "),
            )
            console.log(`🏆 Final Champion status: ${profile.isArenaChampion}`)

            if (profile.isArenaChampion) {
              console.log(`🏆 ✅ *** ARENA CHAMPION DETECTED *** for ${handle}!`)
              console.log(`🏆 ✅ Champion badge found:`, championBadge || championBadgeLoose)
            } else {
              console.log(`👤 ❌ User is NOT an Arena Champion (no badge type 19 found)`)
              console.log(
                `👤 Available badge types:`,
                data.badges.map((b: any) => b.badgeType),
              )
            }
          } else {
            console.log(`❌ No badges found in response or badges is not an array`)
            console.log(`❌ Badges value:`, data.badges)
            console.log(`❌ Response keys:`, Object.keys(data))

            // Explicitly set isArenaChampion to false if no badges found
            profile.isArenaChampion = false
            console.log(`🏆 Set isArenaChampion to false (no badges data)`)
          }

          console.log(`🏆 === BADGE DETECTION DEBUG END ===`)

          console.log(`✅ Successfully enhanced profile with StarsArena stats`)
        } else {
          const errorText = await response.text().catch(() => "Unable to read error")
          console.log(`❌ StarsArena stats endpoint returned ${response.status}: ${errorText.substring(0, 200)}`)

          if (response.status === 403) {
            console.log(`🔒 403 Forbidden - Stats endpoint might require authentication`)
            console.log(`💡 But we got the basic profile data from previous steps`)
          }

          // If we can't get stats, explicitly set champion status to false
          if (profile) {
            profile.isArenaChampion = false
            console.log(`🏆 Set isArenaChampion to false (stats endpoint failed)`)
          }
        }
      } catch (error) {
        console.error(`❌ Failed to fetch stats from StarsArena:`, error)
        // If we can't get stats, explicitly set champion status to false
        if (profile) {
          profile.isArenaChampion = false
          console.log(`🏆 Set isArenaChampion to false (stats fetch error)`)
        }
      }
    } else {
      // If we don't have userId, we can't check badges
      if (profile) {
        profile.isArenaChampion = false
        console.log(`🏆 Set isArenaChampion to false (no userId found)`)
      }
    }

    // Cache the result
    userProfileCache.set(walletAddress.toLowerCase(), {
      profile,
      timestamp: Date.now(),
    })

    if (profile) {
      console.log(`✅ === FINAL PROFILE RESULT ===`)
      console.log(`✅ Wallet: ${walletAddress}`)
      console.log(`✅ Username: ${profile.username}`)
      console.log(`✅ Display Name: ${profile.displayName}`)
      console.log(`✅ Is Arena Champion: ${profile.isArenaChampion}`)
      console.log(`✅ Badges: ${profile.badges?.map((b) => b.badgeType).join(", ") || "none"}`)
      console.log(`✅ Arena followers: ${profile.followerCount || "N/A"}`)
      console.log(`✅ Ticket price: ${profile.keyPrice ? `${formatAvaxValue(profile.keyPrice)} AVAX` : "N/A"}`)
      console.log(`✅ === END FINAL RESULT ===`)
    } else {
      console.log(`❌ No profile found for ${walletAddress}`)
    }

    return profile
  } catch (error) {
    console.error(`❌ Error fetching Arena profile for ${walletAddress}:`, error)

    // Cache null result to prevent repeated failed requests
    userProfileCache.set(walletAddress.toLowerCase(), {
      profile: null,
      timestamp: Date.now(),
    })

    return null
  }
}

// New function to normalize arena.trade array response format
function normalizeArenaTradeArrayResponse(data: any): ArenaUserProfile | null {
  try {
    if (!data) {
      console.log(`No data found in arena.trade array response`)
      return null
    }

    console.log(`Normalizing arena.trade array response:`, data)

    // Map the fields from the array response format
    const profile: ArenaUserProfile = {
      username: data.twitter_handle || data.twitter_handle_lc,
      displayName: data.twitter_username || data.twitter_handle,
      bio: "", // Not available in this response format
      avatar: data.twitter_pfp_url,
      twitter: data.twitter_handle,
      telegram: undefined, // Not available in this response format
      website: undefined, // Not available in this response format
      verified: false, // Not available in this response format
      followerCount: 0, // Arena followers - not available in arena.trade
      twitterFollowerCount: data.twitter_followers || 0, // Twitter followers from arena.trade
      followingCount: 0, // Not available in this response format
      tokenCount: 0, // Not available in this response format
      joinedAt: data.join_time ? new Date(data.join_time * 1000).toISOString() : undefined,
      isArenaChampion: false, // Will be set later if badges are found
    }

    console.log(`🐦 Twitter followers from arena.trade: ${profile.twitterFollowerCount}`)

    // Try to extract Arena stats from the same response
    if (data.key_price !== undefined) profile.keyPrice = data.key_price.toString()
    if (data.total_holders !== undefined) profile.totalHolders = data.total_holders.toString()
    if (data.volume !== undefined) profile.volume = data.volume.toString()
    if (data.supply !== undefined) profile.supply = Number(data.supply)
    if (data.arena_price !== undefined) profile.keyPrice = data.arena_price.toString()
    if (data.holder_count !== undefined) profile.totalHolders = data.holder_count.toString()
    if (data.trade_volume !== undefined) profile.volume = data.trade_volume.toString()

    // Only return profile if we have meaningful data
    if (profile.username || profile.displayName) {
      console.log(`Normalized arena.trade array profile:`, profile)
      return profile
    }

    console.log(`❌ No valid profile data found in arena.trade array response`)
    return null
  } catch (error) {
    console.error("Error normalizing arena.trade array response:", error)
    return null
  }
}

// Function to normalize arena.trade object response with user property
function normalizeArenaTradeObjectResponse(data: any): ArenaUserProfile | null {
  try {
    // Handle both direct user object and wrapped response
    const user = data.user || data

    if (!user) {
      console.log(`No user data found in arena.trade object response`)
      return null
    }

    console.log(`Normalizing arena.trade object response:`, user)

    const profile: ArenaUserProfile = {
      username: user.handle || user.ixHandle || user.twitterHandle,
      displayName: user.twitterName || user.handle || user.ixHandle,
      bio: user.twitterDescription || "",
      avatar: user.twitterPicture || user.lastLoginTwitterPicture,
      twitter: user.twitterHandle,
      telegram: undefined, // Not available in this API response
      website: undefined, // Not available in this API response
      verified: user.twitterConfirmed || false,
      followerCount: user.followerCount || 0, // Arena followers
      twitterFollowerCount: user.twitterFollowerCount || 0, // Twitter followers
      followingCount: user.followingsCount || 0,
      tokenCount: user.threadCount || 0, // Using threadCount as a proxy for activity
      joinedAt: user.createdOn,
      isArenaChampion: false, // Will be set later if badges are found
    }

    // Try to extract Arena stats from the user object
    if (user.keyPrice !== undefined) profile.keyPrice = user.keyPrice.toString()
    if (user.totalHolders !== undefined) profile.totalHolders = user.totalHolders.toString()
    if (user.volume !== undefined) profile.volume = user.volume.toString()
    if (user.supply !== undefined) profile.supply = Number(user.supply)

    // Only return profile if we have meaningful data
    if (profile.username || profile.displayName) {
      console.log(`Normalized arena.trade object profile:`, profile)
      return profile
    }

    console.log(`❌ No valid profile data found in arena.trade object response`)
    return null
  } catch (error) {
    console.error("Error normalizing arena.trade object response:", error)
    return null
  }
}

// Utility function to format AVAX values
export function formatAvaxValue(value: string): string {
  try {
    const avaxValue = Number(value) / 1e18
    if (avaxValue === 0) return "0"
    if (avaxValue < 0.0001) return avaxValue.toFixed(8)
    if (avaxValue < 1) return avaxValue.toFixed(4)
    return avaxValue.toFixed(2)
  } catch (error) {
    return "0"
  }
}

// Batch functie om meerdere profielen tegelijk op te halen
export async function fetchMultipleArenaProfiles(
  walletAddresses: string[],
): Promise<Map<string, ArenaUserProfile | null>> {
  const results = new Map<string, ArenaUserProfile | null>()

  console.log(`Fetching profiles for ${walletAddresses.length} addresses`)

  // Process in smaller batches to avoid overwhelming the API
  const batchSize = 3
  for (let i = 0; i < walletAddresses.length; i += batchSize) {
    const batch = walletAddresses.slice(i, i + batchSize)

    const promises = batch.map(async (address) => {
      const profile = await fetchArenaUserProfile(address)
      return { address: address.toLowerCase(), profile }
    })

    const settled = await Promise.allSettled(promises)

    settled.forEach((result, index) => {
      const address = batch[index]
      if (result.status === "fulfilled") {
        results.set(result.value.address, result.value.profile)
      } else {
        console.error(`Failed to fetch profile for ${address}:`, result.reason)
        results.set(address.toLowerCase(), null)
      }
    })

    // Small delay between batches
    if (i + batchSize < walletAddresses.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

// Update the postToArenaTimeline function signature to include heavy hitter detection
export async function postToArenaTimeline(
  username: string,
  tokenSymbol: string,
  tokenName: string | undefined,
  contractsCreated: number,
  isChampion = false,
  arenaProfile?: ArenaUserProfile | null,
): Promise<boolean> {
  try {
    console.log(
      `📝 Calling Arena post API for @${username} - token: ${tokenSymbol} ${isChampion ? "(CHAMPION 🏆)" : ""}`,
    )

    const response = await fetch("/api/arena-post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        tokenSymbol,
        tokenName,
        contractsCreated,
        isChampion,
        arenaProfile, // Pass the full profile for heavy hitter detection
      }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      console.log(`✅ Successfully posted to Arena timeline for @${username} ${isChampion ? "(CHAMPION 🏆)" : ""}`)
      return true
    } else {
      console.error(`❌ Failed to post to Arena timeline:`, data.error || "Unknown error")
      return false
    }
  } catch (error) {
    console.error(`❌ Error posting to Arena timeline for @${username}:`, error)
    return false
  }
}

// Test functie om een specifiek adres te testen
export async function testArenaProfile(walletAddress: string): Promise<void> {
  console.log(`Testing Arena profile fetch for: ${walletAddress}`)

  // Clear cache voor dit adres
  userProfileCache.delete(walletAddress.toLowerCase())

  const profile = await fetchArenaUserProfile(walletAddress)

  if (profile) {
    console.log(`✅ Profile found:`, profile)
    console.log(`🏆 Is Arena Champion: ${profile.isArenaChampion}`)
    console.log(`🏆 Badges: ${profile.badges?.map((b) => b.badgeType).join(", ") || "none"}`)
    console.log(`👥 Arena followers: ${profile.followerCount || "N/A"}`)
    console.log(`🐦 Twitter followers: ${profile.twitterFollowerCount || "N/A"}`)
  } else {
    console.log(`❌ No profile found for ${walletAddress}`)
  }
}

// Utility functie om te checken of een profiel geldig is
export function isValidArenaProfile(profile: ArenaUserProfile | null): boolean {
  return profile !== null && (!!profile.username || !!profile.displayName || !!profile.bio)
}

// Clear cache functie voor development/testing
export function clearArenaProfileCache(): void {
  console.log(`Clearing Arena profile cache (${userProfileCache.size} entries)`)
  userProfileCache.clear()
}

// Debug functie om cache status te bekijken
export function getArenaProfileCacheStatus(): { size: number; entries: string[] } {
  return {
    size: userProfileCache.size,
    entries: Array.from(userProfileCache.keys()),
  }
}

// Test function to check API connectivity
export async function testApiConnectivity(): Promise<{ arena: boolean; starsarena: boolean }> {
  const results = { arena: false, starsarena: false }

  // Test arena.trade
  try {
    const response = await fetch("https://api.arena.trade/health", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })
    results.arena = response.ok
  } catch (error) {
    console.error("Arena.trade connectivity test failed:", error)
  }

  // Test starsarena (but we know this will fail without auth)
  try {
    const response = await fetch("https://api.starsarena.com/health", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })
    results.starsarena = response.ok
  } catch (error) {
    console.error("StarsArena connectivity test failed:", error)
  }

  return results
}

// Test function to test StarsArena endpoints (keeping for reference but we know it's blocked)
export async function testStarsArenaEndpoints(testHandle: string): Promise<void> {
  console.log(`🧪 Testing complete StarsArena flow for handle: ${testHandle}`)

  try {
    // Step 1: Get userId from handle
    const userEndpoint = `https://api.starsarena.com/user/handle?handle=${testHandle}`
    console.log(`📡 Step 1: ${userEndpoint}`)

    const userResponse = await fetchWithRetry(
      userEndpoint,
      {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36",
          Origin: "https://arena.social",
          Referer: "https://arena.social/",
        },
      },
      1,
    )

    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log(`✅ User data:`, userData)

      if (userData.user && userData.user.id) {
        const userId = userData.user.id
        console.log(`✅ Found userId: ${userId}`)

        // Step 2: Get stats with userId
        const statsEndpoint = `https://api.starsarena.com/shares/stats?userId=${userId}`
        console.log(`📡 Step 2: ${statsEndpoint}`)

        const statsResponse = await fetchWithRetry(
          statsEndpoint,
          {
            method: "GET",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36",
              Origin: "https://arena.social",
              Referer: "https://arena.social/",
            },
          },
          1,
        )

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          console.log(`✅ Stats data:`, statsData)

          // Check for badges and champion status
          if (statsData.badges && Array.isArray(statsData.badges)) {
            const isChampion = statsData.badges.some((badge: any) => badge.badgeType === 19)
            console.log(`🏆 Is Arena Champion: ${isChampion}`)
            console.log(`🏆 Badges: ${statsData.badges.map((b: any) => b.badgeType).join(", ")}`)
          } else {
            console.log(`❌ No badges found in stats response`)
          }
        } else {
          console.log(`❌ Stats request failed: ${statsResponse.status}`)
        }
      }
    } else {
      console.log(`❌ User request failed: ${userResponse.status}`)
    }
  } catch (error) {
    console.error(`❌ Test failed:`, error)
  }
}

// Enhanced function to manually check if a user is an Arena Champion with detailed logging
export async function checkArenaChampionStatus(walletAddress: string): Promise<boolean | null> {
  try {
    console.log(`🏆 === CHAMPION STATUS CHECK START ===`)
    console.log(`🏆 Checking Arena Champion status for ${walletAddress}`)

    // Clear cache for this address to get fresh data
    userProfileCache.delete(walletAddress.toLowerCase())

    // Fetch profile with full logging
    const profile = await fetchArenaUserProfile(walletAddress)

    if (!profile) {
      console.log(`❌ No profile found for ${walletAddress}`)
      console.log(`🏆 === CHAMPION STATUS CHECK END (NO PROFILE) ===`)
      return null
    }

    console.log(`🏆 Profile found for ${walletAddress}:`)
    console.log(`🏆 - Username: ${profile.username}`)
    console.log(`🏆 - Display Name: ${profile.displayName}`)
    console.log(`🏆 - Has badges: ${!!profile.badges}`)
    console.log(`🏆 - Badges count: ${profile.badges?.length || 0}`)
    console.log(`🏆 - Is Champion flag: ${profile.isArenaChampion}`)

    // Check if we have badges data
    if (!profile.badges || !Array.isArray(profile.badges)) {
      console.log(`❌ No badges data found for ${walletAddress}`)
      console.log(`🏆 === CHAMPION STATUS CHECK END (NO BADGES) ===`)
      return null
    }

    // Check for badge type 19 with extensive logging
    console.log(`🏆 Checking ${profile.badges.length} badges for type 19:`)
    profile.badges.forEach((badge, index) => {
      console.log(`🏆 Badge ${index + 1}: type=${badge.badgeType} (${typeof badge.badgeType})`)
    })

    const isChampion = profile.badges.some((badge) => badge.badgeType === 19)
    console.log(`🏆 Final Champion status: ${isChampion}`)
    console.log(`🏆 Profile.isArenaChampion: ${profile.isArenaChampion}`)
    console.log(`🏆 === CHAMPION STATUS CHECK END ===`)

    return isChampion
  } catch (error) {
    console.error(`❌ Error checking Arena Champion status:`, error)
    console.log(`🏆 === CHAMPION STATUS CHECK END (ERROR) ===`)
    return null
  }
}

// New function to force refresh a profile (bypass cache)
export async function forceRefreshArenaProfile(walletAddress: string): Promise<ArenaUserProfile | null> {
  console.log(`🔄 Force refreshing Arena profile for ${walletAddress}`)

  // Clear cache for this address
  userProfileCache.delete(walletAddress.toLowerCase())

  // Fetch fresh profile
  return await fetchArenaUserProfile(walletAddress)
}
