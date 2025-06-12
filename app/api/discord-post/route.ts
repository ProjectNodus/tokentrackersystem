import { NextResponse } from "next/server"
import { env } from "@/lib/env"

// Helper function to format AVAX amount
function formatAvax(amount: number): string {
  if (amount >= 1) {
    return `${amount.toFixed(2)} AVAX`
  } else {
    return `${amount.toFixed(4)} AVAX`
  }
}

// Helper function to format follower count
function formatFollowers(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

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

// Helper function to determine which Discord channel to use
function getDiscordWebhookUrl(isChampion: boolean, isHeavyHitter: boolean): string | null {
  if (isChampion && env.DISCORD_WEBHOOK_CHAMPIONS) {
    return env.DISCORD_WEBHOOK_CHAMPIONS
  }

  if (isHeavyHitter && env.DISCORD_WEBHOOK_HEAVY_HITTERS) {
    return env.DISCORD_WEBHOOK_HEAVY_HITTERS
  }

  if (env.DISCORD_WEBHOOK_GENERAL) {
    return env.DISCORD_WEBHOOK_GENERAL
  }

  return null
}

// Helper function to create Discord embed
function createDiscordEmbed(
  username: string,
  tokenSymbol: string,
  tokenName: string | undefined,
  contractsCreated: number,
  isChampion: boolean,
  arenaProfile: any,
  isHeavyHitter: boolean,
) {
  const tokenDisplay = tokenName ? `$${tokenSymbol} (${tokenName})` : `$${tokenSymbol}`
  const arenaUrl = `https://arena.social/${username}`

  let title: string
  let description: string
  let color: number
  let thumbnail: string | undefined

  if (isChampion) {
    title = `🏆 Arena Champion Token Launch`
    description = `**@${username}** just launched **${tokenDisplay}**\n\nThis might be worth watching closely 👀`
    color = 0xffd700 // Gold
    thumbnail = "https://arena.social/favicon.ico"
  } else if (isHeavyHitter) {
    const followers = arenaProfile?.followerCount || 0
    const ticketPrice = arenaProfile?.keyPrice ? formatAvaxValue(arenaProfile.keyPrice) : "0"
    const isFirstToken = contractsCreated === 1

    title = `🚀 Heavy Hitter Alert`
    description = `**@${username}** launched **${tokenDisplay}**\n\n**${followers.toLocaleString()}** followers • **${ticketPrice} AVAX** ticket\n\n${
      isFirstToken
        ? "🎯 This is their first token — all eyes on the debut."
        : "🔄 Not their first rodeo — pattern or pump incoming?"
    }`
    color = 0xff6b35 // Orange-red
  } else {
    const ordinalCount = getOrdinalNumber(contractsCreated)
    title = `⚠️ New Token Alert`
    description = `**@${username}** launched **${tokenDisplay}**\n\nThis is their **${ordinalCount}** token so far.\n\nStay sharp! ⚠️`
    color = 0x5865f2 // Discord blurple
  }

  const embed = {
    title,
    description,
    color,
    thumbnail: thumbnail ? { url: thumbnail } : undefined,
    fields: [
      {
        name: "👤 Creator",
        value: `[@${username}](${arenaUrl})`,
        inline: true,
      },
      {
        name: "🎯 Token",
        value: tokenDisplay,
        inline: true,
      },
      {
        name: "📊 Total Tokens",
        value: contractsCreated.toString(),
        inline: true,
      },
    ],
    footer: {
      text: "TokenMonitor • Arena Social",
      icon_url: "https://arena.social/favicon.ico",
    },
    timestamp: new Date().toISOString(),
  }

  // Add additional fields for heavy hitters and champions
  if (isChampion || isHeavyHitter) {
    const followers = arenaProfile?.followerCount || 0
    const ticketPrice = arenaProfile?.keyPrice ? formatAvaxValue(arenaProfile.keyPrice) : "0"

    embed.fields.push(
      {
        name: "👥 Followers",
        value: followers.toLocaleString(),
        inline: true,
      },
      {
        name: "🎫 Ticket Price",
        value: `${ticketPrice} AVAX`,
        inline: true,
      },
    )
  }

  return embed
}

export async function POST(request: Request) {
  try {
    const { username, tokenSymbol, tokenName, contractsCreated, isChampion, arenaProfile, contractAddress } =
      await request.json()

    // Determine which webhook to use based on user type
    let webhookUrl: string | undefined
    let embedColor: number
    let title: string

    // Get follower count and ticket price
    const followerCount = arenaProfile?.followerCount || 0
    const ticketPrice = arenaProfile?.keyPrice ? Number(arenaProfile.keyPrice) / 1e18 : 0

    // Determine channel based on user status
    if (isChampion) {
      webhookUrl = env.DISCORD_WEBHOOK_CHAMPIONS
      embedColor = 0xffd700 // Gold color for champions
      title = `🏆 CHAMPION ALERT: @${username} created $${tokenSymbol}`
    } else if (followerCount >= 5000 || ticketPrice >= 1.5) {
      webhookUrl = env.DISCORD_WEBHOOK_HEAVY_HITTERS
      embedColor = 0xff4500 // Orange-red for heavy hitters
      title = `🚀 HEAVY HITTER: @${username} created $${tokenSymbol}`
    } else {
      webhookUrl = env.DISCORD_WEBHOOK_GENERAL
      embedColor = 0x3498db // Blue for regular posts
      title = `⚠️ NEW TOKEN: @${username} created $${tokenSymbol}`
    }

    if (!webhookUrl) {
      console.error("❌ No webhook URL found for channel type")
      return NextResponse.json({ error: "Webhook URL not configured" }, { status: 500 })
    }

    // Create the embed
    const embed = {
      title,
      color: embedColor,
      url: `https://arena.xyz/@${username}`,
      description: tokenName ? `Token Name: **${tokenName}**` : `New token created: **$${tokenSymbol}**`,
      fields: [
        {
          name: "Creator",
          value: `[@${username}](https://arena.xyz/@${username})`,
          inline: true,
        },
        {
          name: "Tokens Created",
          value: contractsCreated.toString(),
          inline: true,
        },
      ],
      footer: {
        text: "TokenMonitor by Arena",
      },
      timestamp: new Date().toISOString(),
    }

    // Add extra fields for general channel
    if (!isChampion && !(followerCount >= 5000 || ticketPrice >= 1.5)) {
      // Add contract address if available
      if (contractAddress) {
        embed.fields.push({
          name: "Contract Address",
          value: `[${contractAddress.substring(0, 8)}...${contractAddress.substring(36)}](https://snowtrace.io/address/${contractAddress})`,
          inline: false,
        })
      }

      // Add follower count
      embed.fields.push({
        name: "Followers",
        value: formatFollowers(followerCount),
        inline: true,
      })

      // Add ticket price
      embed.fields.push({
        name: "Ticket Price",
        value: formatAvax(ticketPrice),
        inline: true,
      })
    }

    // Prepare the webhook payload
    const payload = {
      username: "TokenMonitor Bot",
      avatar_url: "https://i.imgur.com/4M34hi2.png", // Optional: Add your bot's avatar URL
      embeds: [embed],
    }

    // Send the webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Discord webhook error: ${response.status} - ${errorText}`)
      return NextResponse.json({ error: `Discord webhook failed: ${response.status}` }, { status: response.status })
    }

    // Determine which channel was used
    let channelType = "unknown"
    if (webhookUrl === env.DISCORD_WEBHOOK_CHAMPIONS) channelType = "champions"
    else if (webhookUrl === env.DISCORD_WEBHOOK_HEAVY_HITTERS) channelType = "heavy-hitters"
    else if (webhookUrl === env.DISCORD_WEBHOOK_GENERAL) channelType = "general"

    console.log(`✅ Discord post sent to ${channelType} channel for @${username}`)
    return NextResponse.json({ success: true, channel: channelType })
  } catch (error) {
    console.error("❌ Error in Discord webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
