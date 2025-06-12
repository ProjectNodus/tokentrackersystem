import { supabase } from "./supabase"

export type TokenData = {
  symbol: string
  name: string
  address: string
  transaction_hash: string
  created_at: string
}

export type Creator = {
  wallet_address: string
  contracts_created: number
  contract_tickers: TokenData[]
  first_seen_at: string
  last_contract_at: string
}

/**
 * Updates or creates a creator record when a new token is created
 */
export async function updateCreatorOnTokenCreation(walletAddress: string, tokenData: TokenData): Promise<void> {
  try {
    // Check if creator exists
    const { data: existingCreator } = await supabase
      .from("creators")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()

    if (existingCreator) {
      // Update existing creator
      await supabase
        .from("creators")
        .update({
          contracts_created: existingCreator.contracts_created + 1,
          contract_tickers: [...existingCreator.contract_tickers, tokenData],
          last_contract_at: new Date().toISOString(),
        })
        .eq("wallet_address", walletAddress)
    } else {
      // Insert new creator
      await supabase.from("creators").insert({
        wallet_address: walletAddress,
        contracts_created: 1,
        contract_tickers: [tokenData],
        first_seen_at: new Date().toISOString(),
        last_contract_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error updating creator:", error)
    throw error
  }
}

/**
 * Gets all creators ordered by contracts created
 */
export async function getCreators(): Promise<Creator[]> {
  try {
    const { data, error } = await supabase.from("creators").select("*").order("contracts_created", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching creators:", error)
    throw error
  }
}

/**
 * Searches for creators by wallet address or token symbol/name
 */
export async function searchCreators(searchTerm: string): Promise<Creator[]> {
  try {
    // First search by wallet address
    const { data: walletResults, error: walletError } = await supabase
      .from("creators")
      .select("*")
      .ilike("wallet_address", `%${searchTerm}%`)

    if (walletError) throw walletError

    // Then search by token symbols/names in the JSONB field
    const { data: tokenResults, error: tokenError } = await supabase
      .from("creators")
      .select("*")
      .or(`contract_tickers->symbol.ilike.%${searchTerm}%,contract_tickers->name.ilike.%${searchTerm}%`)

    if (tokenError) throw tokenError

    // Combine and deduplicate results
    const combinedResults = [...(walletResults || []), ...(tokenResults || [])]
    const uniqueResults = Array.from(new Map(combinedResults.map((item) => [item.wallet_address, item])).values())

    return uniqueResults
  } catch (error) {
    console.error("Error searching creators:", error)
    throw error
  }
}
