// Helper function to post to Discord
export async function postToDiscordChannels(
  username: string,
  tokenSymbol: string,
  tokenName: string | undefined,
  contractsCreated: number,
  isChampion: boolean,
  arenaProfile: any,
  contractAddress?: string,
): Promise<boolean> {
  try {
    console.log(`🎮 Posting to Discord for @${username} - ${tokenSymbol}`)

    const response = await fetch("/api/discord-post", {
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
        arenaProfile,
        contractAddress,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Discord post successful: ${result.channel} channel`)
      return true
    } else {
      const error = await response.text().catch(() => "Unknown error")
      console.error(`❌ Discord post failed: ${response.status} - ${error}`)
      return false
    }
  } catch (error) {
    console.error("❌ Error posting to Discord:", error)
    return false
  }
}

// Helper function with retry logic
export async function postToDiscordWithRetry(
  username: string,
  tokenSymbol: string,
  tokenName: string | undefined,
  contractsCreated: number,
  isChampion: boolean,
  arenaProfile: any,
  contractAddress?: string,
  maxRetries = 2,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🎮 Discord post attempt ${attempt}/${maxRetries} for @${username}`)

    const success = await postToDiscordChannels(
      username,
      tokenSymbol,
      tokenName,
      contractsCreated,
      isChampion,
      arenaProfile,
      contractAddress,
    )

    if (success) {
      return true
    }

    if (attempt < maxRetries) {
      const delay = attempt * 1000 // 1s, 2s delay
      console.log(`⏳ Retrying Discord post in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  console.error(`❌ All Discord post attempts failed for @${username}`)
  return false
}
