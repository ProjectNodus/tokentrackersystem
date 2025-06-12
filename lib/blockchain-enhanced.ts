import { saveCompleteTokenCreation } from "./database"
import { fetchArenaUserProfile } from "./arena-socials"
import type { ContractTransaction } from "./blockchain"

// Enhanced monitoring callback that saves to database
export function createDatabaseSavingCallback() {
  return async (transaction: ContractTransaction) => {
    try {
      console.log(`🔄 Processing transaction for database save: ${transaction.hash}`)

      // Only save token creations to database
      if (!transaction.isTokenCreation) {
        console.log(`⏭️ Skipping non-token-creation transaction: ${transaction.hash}`)
        return
      }

      // Fetch creator profile if not already available
      let arenaProfile = transaction.creatorProfile?.arenaProfile || null

      if (!arenaProfile && !transaction.creatorProfile?.isLoading) {
        console.log(`🔍 Fetching Arena profile for creator: ${transaction.from}`)
        try {
          arenaProfile = await fetchArenaUserProfile(transaction.from)
        } catch (error) {
          console.error(`❌ Error fetching Arena profile for ${transaction.from}:`, error)
        }
      }

      // Save to database
      const result = await saveCompleteTokenCreation(transaction, arenaProfile)

      if (result.tokenId) {
        console.log(`✅ Token creation saved to database: ${result.tokenId}`)
      } else {
        console.log(`❌ Failed to save token creation to database`)
      }
    } catch (error) {
      console.error(`❌ Error in database saving callback:`, error)
    }
  }
}
