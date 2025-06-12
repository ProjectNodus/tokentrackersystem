import { NextResponse } from "next/server"
import { fetchWithRetry } from "@/lib/arena-socials"
import { env } from "@/lib/env"

// Helper function to get ordinal numbers (1st, 2nd, 3rd, etc.)
function getOrdinalNumber(num: number): string {
  const suffix = ["th", "st", "nd", "rd"]
  const value = num % 100
  return num + (suffix[(value - 20) % 10] || suffix[value] || suffix[0])
}

// Helper function to check if a creator is a heavy hitter
function checkHeavyHitter(arenaProfile: any): { isHeavy: boolean; reason?: string } {
  if (!arenaProfile) {
    return { isHeavy: false }
  }

  const followers = arenaProfile.followerCount || 0
  const keyPrice = arenaProfile.keyPrice ? Number(arenaProfile.keyPrice) / 1e18 : 0

  // Check follower threshold (5000+)
  if (followers >= 5000) {
    return {
      isHeavy: true,
      reason: `${followers.toLocaleString()} followers (≥5000)`,
    }
  }

  // Check ticket price threshold (1.5+ AVAX)
  if (keyPrice >= 1.5) {
    return {
      isHeavy: true,
      reason: `${keyPrice.toFixed(2)} AVAX ticket price (≥1.5)`,
    }
  }

  return { isHeavy: false }
}

// Helper function to format AVAX values for display
function formatAvaxValue(value: string): string {
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

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { username, tokenSymbol, tokenName, contractsCreated, isChampion, arenaProfile } = await request.json()

    // Validate required fields
    if (!username || !tokenSymbol || !contractsCreated) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    console.log(
      `📝 API: Posting to Arena timeline for @${username} - token: ${tokenSymbol} ${isChampion ? "(CHAMPION 🏆)" : ""}`,
    )

    // Check if this is a heavy hitter
    const isHeavyHitter = checkHeavyHitter(arenaProfile)

    if (isHeavyHitter.isHeavy) {
      console.log(`🚀 HEAVY HITTER DETECTED! @${username} - ${isHeavyHitter.reason}`)
    }

    // Build the message based on priority: Champion > Heavy Hitter > Regular
    let message: string

    if (isChampion) {
      // Champion-specific message (highest priority)
      const tokenDisplay = tokenName ? `$${tokenSymbol} (${tokenName})` : `$${tokenSymbol}`
      message = `🏆 Arena Champion @${username} (https://arena.social/${username}) just launched a new token: ${tokenDisplay}.<br><br>This might be worth watching closely 👀`
      console.log(`🏆 Champion message: ${message}`)
    } else if (isHeavyHitter.isHeavy) {
      // Heavy hitter message (second priority)
      const followers = arenaProfile?.followerCount || 0
      const ticketPrice = arenaProfile?.keyPrice ? formatAvaxValue(arenaProfile.keyPrice) : "0"
      const isFirstToken = contractsCreated === 1

      message = `🚀 A heavy hitter just dropped: @${username} (https://arena.social/${username}) launched $${tokenSymbol}${tokenName ? ` (${tokenName})` : ""}.<br><br>${followers.toLocaleString()} followers. Ticket: ${ticketPrice} AVAX.<br><br>${
        isFirstToken
          ? "This is their first token — all eyes on the debut."
          : "Not their first rodeo — pattern or pump incoming?"
      }`

      console.log(`🚀 Heavy hitter message: ${message}`)
    } else {
      // Regular creator message (existing logic)
      const tokenDisplay = tokenName ? `${tokenSymbol} (${tokenName})` : tokenSymbol
      const ordinalCount = getOrdinalNumber(contractsCreated)
      message = `⚠️ALERT⚠️<br><br>@${username} (https://arena.social/${username}) <br><br>has just launched the token ${tokenDisplay} on arenabook.xyz. This is their ${ordinalCount} token so far.<br><br> Stay sharp!⚠️`
      console.log(`📝 Regular message: ${message}`)
    }

    // Check if we have the bearer token
    if (!env.ARENA_BEARER_TOKEN) {
      console.error("❌ ARENA_BEARER_TOKEN not found in environment variables")
      return NextResponse.json({ success: false, error: "ARENA_BEARER_TOKEN not configured" }, { status: 500 })
    }

    // Make the POST request to StarsArena API
    const response = await fetchWithRetry(
      "https://api.starsarena.com/threads",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.ARENA_BEARER_TOKEN}`,
          "Content-Type": "application/json",
          Origin: "https://arena.social",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          Referer: "https://arena.social/",
        },
        body: JSON.stringify({
          content: message,
          POST: [],
          privacyType: 0,
        }),
      },
      2, // Max 2 retries
    )

    if (response.ok) {
      const responseData = await response.json().catch(() => ({}))
      const statusLabel = isChampion ? "(CHAMPION 🏆)" : isHeavyHitter.isHeavy ? "(HEAVY HITTER 🚀)" : ""
      console.log(`✅ Successfully posted to Arena timeline for @${username} ${statusLabel}`)
      console.log(`📊 Response:`, responseData)
      return NextResponse.json({ success: true, data: responseData })
    } else {
      const errorText = await response.text().catch(() => "Unable to read error")
      console.error(`❌ Failed to post to Arena timeline: ${response.status} - ${errorText}`)
      return NextResponse.json({ success: false, error: `API Error: ${response.status}` }, { status: response.status })
    }
  } catch (error) {
    console.error(`❌ Error in arena-post API route:`, error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
