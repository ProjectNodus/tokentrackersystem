import { createPublicClient, http, parseAbiItem, type Address, decodeAbiParameters, decodeEventLog } from "viem"
import { avalanche } from "viem/chains"
import { fetchArenaUserProfile, type ArenaUserProfile } from "./arena-socials"
import { processTokenCreation } from "./database-simple"

// Arena Launch Contract address
const ARENA_CONTRACT_ADDRESS = "0x8315f1eb449Dd4B779495C3A0b05e5d194446c6e" as const

// ABI for the TokenCreated event - Updated structure
const TOKEN_CREATED_EVENT = parseAbiItem(
  "event TokenCreated(uint256 tokenId, (uint128 curveScaler, uint16 a, uint8 b, bool lpDeployed, uint8 lpPercentage, uint8 salePercentage, uint8 creatorFeeBasisPoints, address creatorAddress, address pairAddress, address tokenContractAddress) params, uint256 tokenSupply)",
)

// Initialize the Avalanche client
const client = createPublicClient({
  chain: avalanche,
  transport: http("https://api.avax.network/ext/bc/C/rpc"),
})

export interface TokenData {
  address?: string
  hash?: string
  creator?: string
  name?: string
  symbol?: string
  totalSupply?: string
  timestamp?: number
  isPending?: boolean
  blockNumber?: bigint
  tokenId?: string
  tokenContractAddress?: string
}

export interface TokenMetadata {
  name?: string
  symbol?: string
  totalSupply?: string
  creator?: string
  tokenAddress?: string
}

export interface CreatorProfile {
  address: string
  arenaProfile?: ArenaUserProfile | null
  isLoading?: boolean
}

export type TransactionType =
  | "TOKEN_CREATION"
  | "BUY"
  | "SELL"
  | "ADD_LIQUIDITY"
  | "REMOVE_LIQUIDITY"
  | "APPROVE"
  | "TRANSFER"
  | "UNKNOWN"

export interface ContractTransaction {
  hash: string
  from: string
  to: string | null
  value: string
  blockNumber: bigint
  timestamp?: number
  method?: string
  methodId?: string
  transactionType: TransactionType
  isTokenCreation?: boolean
  description: string
  tokenMetadata?: TokenMetadata
  creatorProfile?: CreatorProfile
  rawInput?: string
  tokenAddress?: string
}

// Uitgebreide method signatures voor Arena contract functies
const METHOD_SIGNATURES: Record<string, { name: string; type: TransactionType; description: string }> = {
  // Token Creation
  "0x0b8c6fec": {
    name: "createToken",
    type: "TOKEN_CREATION",
    description: "Create new token",
  },
  "0x30f51a46": {
    name: "createToken",
    type: "TOKEN_CREATION",
    description: "Create new token",
  },

  // Liquidity Management
  "0x5a46f06c": {
    name: "createLP",
    type: "ADD_LIQUIDITY",
    description: "Add initial liquidity",
  },
  "0xe8e33700": {
    name: "addLiquidity",
    type: "ADD_LIQUIDITY",
    description: "Add liquidity to pool",
  },
  "0xbaa2abde": {
    name: "removeLiquidity",
    type: "REMOVE_LIQUIDITY",
    description: "Remove liquidity from pool",
  },

  // Trading
  "0xa6f2ae3a": {
    name: "buy",
    type: "BUY",
    description: "Buy tokens with AVAX",
  },
  "0x7ff36ab5": {
    name: "sell",
    type: "SELL",
    description: "Sell tokens for AVAX",
  },
  "0x38ed1739": {
    name: "swapExactTokensForETH",
    type: "SELL",
    description: "Swap tokens for AVAX",
  },
  "0x7c025200": {
    name: "swapETHForExactTokens",
    type: "BUY",
    description: "Swap AVAX for tokens",
  },

  // Standard ERC20 functions
  "0x095ea7b3": {
    name: "approve",
    type: "APPROVE",
    description: "Approve token spending",
  },
  "0xa9059cbb": {
    name: "transfer",
    type: "TRANSFER",
    description: "Transfer tokens",
  },
  "0x23b872dd": {
    name: "transferFrom",
    type: "TRANSFER",
    description: "Transfer tokens from address",
  },

  // Additional Arena-specific functions
  "0x2e1a7d4d": {
    name: "withdraw",
    type: "SELL",
    description: "Withdraw AVAX",
  },
  "0xd0e30db0": {
    name: "deposit",
    type: "BUY",
    description: "Deposit AVAX",
  },
}

// Global state voor real-time monitoring
let isMonitoring = false
let lastProcessedBlock = 0n
let monitoringCallbacks: Array<(tx: ContractTransaction) => void> = []
let monitoringTimeout: NodeJS.Timeout | null = null

// Decode token creation data from transaction input
export function decodeTokenCreationData(methodId: string, input: string): TokenMetadata | null {
  try {
    if (methodId === "0x0b8c6fec") {
      // Original createToken format
      const data = `0x${input.slice(10)}`
      const decoded = decodeAbiParameters(
        [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "totalSupply", type: "uint256" },
          { name: "taxPercentage", type: "uint256" },
        ],
        data,
      )

      return {
        name: decoded[0],
        symbol: decoded[1],
        totalSupply: decoded[2].toString(),
      }
    } else if (methodId === "0x30f51a46") {
      // New createToken format
      const data = `0x${input.slice(10)}`
      const decoded = decodeAbiParameters(
        [
          { name: "param1", type: "uint16" },
          { name: "param2", type: "uint8" },
          { name: "param3", type: "uint128" },
          { name: "param4", type: "uint8" },
          { name: "creator", type: "address" },
          { name: "param6", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "totalSupply", type: "uint256" },
        ],
        data,
      )

      return {
        name: decoded[6],
        symbol: decoded[7],
        totalSupply: decoded[8].toString(),
        creator: decoded[4],
      }
    }
  } catch (error) {
    console.error("Error decoding token creation data:", error)
  }

  return null
}

// Functie om creator profile op te halen
async function fetchCreatorProfile(address: string): Promise<CreatorProfile> {
  const profile: CreatorProfile = {
    address,
    isLoading: true, // Start with loading state
  }

  try {
    console.log(`🔍 Fetching creator profile for ${address}`)
    const arenaProfile = await fetchArenaUserProfile(address)

    profile.arenaProfile = arenaProfile
    profile.isLoading = false

    if (arenaProfile) {
      console.log(`✅ Creator profile loaded for ${address}:`, arenaProfile)
      if (arenaProfile.keyPrice) {
        console.log(`💰 Ticket price found: ${arenaProfile.keyPrice} wei`)
      }
    } else {
      console.log(`❌ No Arena profile found for ${address}`)
    }
  } catch (error) {
    console.error(`❌ Error fetching creator profile for ${address}:`, error)
    profile.arenaProfile = null
    profile.isLoading = false
  }

  return profile
}

// Functie om transactie type te bepalen op basis van method ID en value
function determineTransactionType(
  methodId: string,
  value: string,
): {
  type: TransactionType
  description: string
  method: string
} {
  const methodInfo = METHOD_SIGNATURES[methodId]

  if (methodInfo) {
    return {
      type: methodInfo.type,
      description: methodInfo.description,
      method: methodInfo.name,
    }
  }

  // Verbeterde fallback logica
  // Check of de method ID begint met "0x" gevolgd door "create" of "token" in de hex representatie
  const methodIdLower = methodId.toLowerCase()
  if (methodIdLower.includes("create") || methodIdLower.includes("token")) {
    return {
      type: "TOKEN_CREATION",
      description: "Possible token creation",
      method: "unknown_create",
    }
  }

  // Als er AVAX wordt gestuurd, is het waarschijnlijk een buy
  const valueInAvax = Number(value) / 1e18
  if (valueInAvax > 0) {
    return {
      type: "BUY",
      description: "Buy transaction (AVAX sent)",
      method: "unknown_buy",
    }
  }

  return {
    type: "UNKNOWN",
    description: "Unknown transaction type",
    method: methodId || "unknown",
  }
}

// Async function to notify callbacks (prevents render-time state updates)
function notifyCallbacks(transaction: ContractTransaction) {
  // Use setTimeout to ensure callbacks are called asynchronously
  setTimeout(() => {
    monitoringCallbacks.forEach((callback) => {
      try {
        callback(transaction)
      } catch (error) {
        console.error("Error in monitoring callback:", error)
      }
    })

    // Process token creation for database storage
    if (transaction.isTokenCreation) {
      processTokenCreation(transaction).catch((error) => {
        console.error("Error processing token creation for database:", error)
      })
    }
  }, 0)
}

// Real-time contract monitoring functie
async function monitorContract() {
  if (!isMonitoring) return

  try {
    const latestBlock = await client.getBlockNumber()

    // Initialize lastProcessedBlock if not set
    if (lastProcessedBlock === 0n) {
      lastProcessedBlock = latestBlock - 1n // Start from previous block
      console.log(`Starting monitoring from block ${lastProcessedBlock}`)

      // Schedule next check
      monitoringTimeout = setTimeout(monitorContract, 3000)
      return
    }

    // Check if there are new blocks
    if (latestBlock > lastProcessedBlock) {
      console.log(`New blocks detected: ${lastProcessedBlock + 1n} to ${latestBlock}`)

      // Process each new block
      for (let blockNum = lastProcessedBlock + 1n; blockNum <= latestBlock; blockNum++) {
        try {
          const block = await client.getBlock({ blockNumber: blockNum, includeTransactions: true })

          if (!block.transactions) continue

          // Check each transaction in the block
          for (const tx of block.transactions) {
            if (typeof tx === "object" && tx.to?.toLowerCase() === ARENA_CONTRACT_ADDRESS.toLowerCase()) {
              const methodId = tx.input.slice(0, 10)
              const transactionInfo = determineTransactionType(methodId, tx.value.toString())

              // Only process token creations for real-time monitoring
              if (transactionInfo.type !== "TOKEN_CREATION") continue

              // Decode token metadata if it's a token creation
              let tokenMetadata: TokenMetadata | null = null
              if (transactionInfo.type === "TOKEN_CREATION") {
                tokenMetadata = decodeTokenCreationData(methodId, tx.input)
              }

              const contractTx: ContractTransaction = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                blockNumber: block.number!,
                timestamp: Number(block.timestamp) * 1000,
                method: transactionInfo.method,
                methodId,
                transactionType: transactionInfo.type,
                isTokenCreation: transactionInfo.type === "TOKEN_CREATION",
                description: transactionInfo.description,
                tokenMetadata,
                rawInput: tx.input,
              }

              console.log(`New token creation found: ${contractTx.hash} - ${contractTx.description}`)

              // Notify callbacks first without profile
              notifyCallbacks(contractTx)

              // Fetch creator profile asynchronously and notify again
              if (transactionInfo.type === "TOKEN_CREATION") {
                fetchCreatorProfile(tx.from)
                  .then((profile) => {
                    contractTx.creatorProfile = profile
                    // Notify callbacks again with updated profile
                    notifyCallbacks(contractTx)
                  })
                  .catch((error) => {
                    console.error(`Error fetching profile for ${tx.from}:`, error)
                  })
              }
            }
          }

          // Small delay between blocks to avoid overwhelming the system
          if (blockNum < latestBlock) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        } catch (error) {
          console.error(`Error processing block ${blockNum}:`, error)
        }
      }

      lastProcessedBlock = latestBlock
    }
  } catch (error) {
    console.error("Error in contract monitoring:", error)
  }

  // Schedule next check - slower polling to be more stable
  if (isMonitoring) {
    monitoringTimeout = setTimeout(monitorContract, 3000) // Check every 3 seconds
  }
}

// Start real-time monitoring
export function startContractMonitoring(): void {
  if (isMonitoring) {
    console.log("Contract monitoring is already running")
    return
  }

  console.log("Starting real-time contract monitoring...")
  isMonitoring = true

  // Clear any existing timeout
  if (monitoringTimeout) {
    clearTimeout(monitoringTimeout)
  }

  // Start monitoring
  monitorContract()
}

// Stop real-time monitoring
export function stopContractMonitoring(): void {
  console.log("Stopping contract monitoring...")
  isMonitoring = false

  // Clear timeout
  if (monitoringTimeout) {
    clearTimeout(monitoringTimeout)
    monitoringTimeout = null
  }

  monitoringCallbacks = []
  lastProcessedBlock = 0n
}

// Subscribe to real-time contract transactions
export function subscribeToContractTransactions(callback: (tx: ContractTransaction) => void): () => void {
  monitoringCallbacks.push(callback)

  // Start monitoring if not already running
  if (!isMonitoring) {
    startContractMonitoring()
  }

  // Return unsubscribe function
  return () => {
    const index = monitoringCallbacks.indexOf(callback)
    if (index > -1) {
      monitoringCallbacks.splice(index, 1)
    }

    // Stop monitoring if no more callbacks
    if (monitoringCallbacks.length === 0) {
      stopContractMonitoring()
    }
  }
}

// Get monitoring status
export function getMonitoringStatus(): {
  isMonitoring: boolean
  lastProcessedBlock: string
  subscriberCount: number
} {
  return {
    isMonitoring,
    lastProcessedBlock: lastProcessedBlock.toString(),
    subscriberCount: monitoringCallbacks.length,
  }
}

// Helper functie om token address te extraheren uit events
async function extractTokenAddressFromTransaction(txHash: string): Promise<string | null> {
  try {
    console.log(`Extracting token address from transaction ${txHash}`)

    // Haal de transaction receipt op
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })

    // Zoek naar TokenCreated events
    for (const log of receipt.logs) {
      // Check of het log van het Arena contract komt
      if (log.address.toLowerCase() === ARENA_CONTRACT_ADDRESS.toLowerCase()) {
        try {
          // Probeer te decoderen als TokenCreated event
          const decoded = decodeEventLog({
            abi: [TOKEN_CREATED_EVENT],
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === "TokenCreated" && decoded.args.params?.tokenContractAddress) {
            console.log(`✅ Found token contract address in event: ${decoded.args.params.tokenContractAddress}`)
            return decoded.args.params.tokenContractAddress as string
          }
        } catch (e) {
          // Niet een TokenCreated event, ga door
        }
      }
    }

    console.log(`❌ No token address found in transaction ${txHash}`)
    return null
  } catch (error) {
    console.error(`Error extracting token address from transaction:`, error)
    return null
  }
}

// Fetch recent contract transactions (for initial load)
export async function fetchContractTransactions(
  limit = 50,
  filterType?: TransactionType,
): Promise<ContractTransaction[]> {
  try {
    console.log(`Starting fetchContractTransactions with limit ${limit} and filter ${filterType}`)

    // Get the latest block number
    const latestBlock = await client.getBlockNumber()

    // Fetch the last 500 blocks for initial load
    const fromBlock = latestBlock - 500n
    const toBlock = latestBlock

    console.log(`Fetching initial contract transactions from block ${fromBlock} to ${toBlock}`)

    const transactions: ContractTransaction[] = []

    // Fetch blocks in smaller chunks
    const chunkSize = 50n
    for (let i = fromBlock; i <= toBlock; i += chunkSize) {
      const endBlock = i + chunkSize - 1n > toBlock ? toBlock : i + chunkSize - 1n

      try {
        // Get blocks with full transaction details
        const blocks = await Promise.all(
          Array.from({ length: Number(endBlock - i + 1n) }, (_, index) =>
            client.getBlock({ blockNumber: i + BigInt(index), includeTransactions: true }),
          ),
        )

        for (const block of blocks) {
          if (!block.transactions) continue

          for (const tx of block.transactions) {
            // Check if transaction is to our contract
            if (typeof tx === "object" && tx.to?.toLowerCase() === ARENA_CONTRACT_ADDRESS.toLowerCase()) {
              const methodId = tx.input.slice(0, 10)
              const transactionInfo = determineTransactionType(methodId, tx.value.toString())

              // Skip if we're filtering and this doesn't match
              if (filterType && transactionInfo.type !== filterType) {
                continue
              }

              // Decode token metadata if it's a token creation
              let tokenMetadata: TokenMetadata | null = null
              if (transactionInfo.type === "TOKEN_CREATION") {
                tokenMetadata = decodeTokenCreationData(methodId, tx.input)

                // Als we geen token address hebben in de metadata, probeer het uit de events te halen
                if (!tokenMetadata?.tokenAddress) {
                  const tokenAddress = await extractTokenAddressFromTransaction(tx.hash)
                  if (tokenAddress) {
                    if (!tokenMetadata) {
                      tokenMetadata = { tokenAddress }
                    } else {
                      tokenMetadata.tokenAddress = tokenAddress
                    }
                  }
                }
              }

              const contractTx: ContractTransaction = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                blockNumber: block.number!,
                timestamp: Number(block.timestamp) * 1000,
                method: transactionInfo.method,
                methodId,
                transactionType: transactionInfo.type,
                isTokenCreation: transactionInfo.type === "TOKEN_CREATION",
                description: transactionInfo.description,
                tokenMetadata,
                rawInput: tx.input,
              }

              if (transactionInfo.type === "TOKEN_CREATION") {
                contractTx.tokenAddress = await extractTokenAddressFromTransaction(tx.hash)
              }

              transactions.push(contractTx)
            }
          }
        }

        // Small delay between chunks
        if (i + chunkSize <= toBlock) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Error fetching blocks ${i} to ${endBlock}:`, error)
        continue
      }
    }

    // Sort by block number (newest first) and limit results
    const sortedTransactions = transactions.sort((a, b) => Number(b.blockNumber - a.blockNumber)).slice(0, limit)

    console.log(`Found ${sortedTransactions.length} transactions matching filter`)

    // Fetch creator profiles for token creations
    const tokenCreations = sortedTransactions.filter((tx) => tx.transactionType === "TOKEN_CREATION")
    if (tokenCreations.length > 0) {
      console.log(`🔍 Fetching creator profiles for ${tokenCreations.length} token creations...`)

      // Fetch profiles in parallel and update transactions when complete
      const profilePromises = tokenCreations.map(async (tx) => {
        try {
          console.log(`🔍 Fetching profile for creator: ${tx.from}`)
          const profile = await fetchCreatorProfile(tx.from)

          // Update the transaction with the profile
          tx.creatorProfile = profile

          if (profile.arenaProfile?.keyPrice) {
            console.log(`💰 Found ticket price for ${tx.from}: ${profile.arenaProfile.keyPrice}`)
          }

          return { tx, profile }
        } catch (error) {
          console.error(`❌ Error fetching profile for ${tx.from}:`, error)
          return { tx, profile: { address: tx.from, arenaProfile: null, isLoading: false } }
        }
      })

      // Wait for all profiles to be fetched (with timeout)
      try {
        await Promise.allSettled(profilePromises)
        console.log(`✅ Completed fetching all creator profiles`)
      } catch (error) {
        console.error(`❌ Error in profile fetching:`, error)
      }
    }

    console.log(`Returning ${sortedTransactions.length} transactions`)
    return sortedTransactions
  } catch (error) {
    console.error("Error fetching contract transactions:", error)
    return []
  }
}

// Legacy function - now uses the new monitoring system
export function watchContractTransactions(callback: (tx: ContractTransaction) => void): () => void {
  return subscribeToContractTransactions(callback)
}

// Fetch recent token creations with limited block range
export async function fetchTokens(): Promise<TokenData[]> {
  try {
    // Get the latest block number
    const blockNumber = await client.getBlockNumber()

    // Only fetch from the last 500 blocks for initial load
    const fromBlock = blockNumber - 500n

    console.log(`Fetching token events from block ${fromBlock} to ${blockNumber}`)

    // Fetch events
    const logs = await client.getLogs({
      address: ARENA_CONTRACT_ADDRESS,
      event: TOKEN_CREATED_EVENT,
      fromBlock,
      toBlock: blockNumber,
    })

    console.log(`Found ${logs.length} token creation events`)

    // Process the logs to extract token data
    const tokens = await Promise.all(
      logs.map(async (log) => {
        try {
          const block = await client.getBlock({ blockNumber: log.blockNumber })

          // Extract data from the new event structure
          const tokenId = log.args.tokenId?.toString()
          const params = log.args.params
          const tokenSupply = log.args.tokenSupply?.toString()

          return {
            address: params?.tokenContractAddress as string,
            tokenContractAddress: params?.tokenContractAddress as string,
            creator: params?.creatorAddress as string,
            name: undefined, // Name not available in event, would need separate call
            symbol: undefined, // Symbol not available in event, would need separate call
            totalSupply: tokenSupply,
            timestamp: Number(block.timestamp) * 1000,
            blockNumber: log.blockNumber,
            hash: log.transactionHash,
            isPending: false,
            tokenId,
          }
        } catch (error) {
          console.error("Error processing log:", error)
          return null
        }
      }),
    )

    // Filter out null values and sort by block number, newest first
    const validTokens = tokens.filter(Boolean) as TokenData[]
    return validTokens.sort((a, b) => Number((b.blockNumber || 0n) - (a.blockNumber || 0n)))
  } catch (error) {
    console.error("Error fetching token creation events:", error)
    return []
  }
}

// Fetch pending transactions that are creating tokens
export async function fetchPendingTransactions(): Promise<TokenData[]> {
  try {
    // Note: Most RPC endpoints don't provide reliable pending transaction data
    // This is a placeholder implementation
    console.log("Fetching pending transactions...")
    return []
  } catch (error) {
    console.error("Error fetching pending transactions:", error)
    return []
  }
}

// Function to listen for new token creation events in real-time
export function subscribeToTokenCreations(callback: (token: TokenData) => void) {
  try {
    const unwatch = client.watchContractEvent({
      address: ARENA_CONTRACT_ADDRESS as Address,
      event: TOKEN_CREATED_EVENT,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            const block = await client.getBlock({ blockNumber: log.blockNumber })

            // Extract data from the new event structure
            const tokenId = log.args.tokenId?.toString()
            const params = log.args.params
            const tokenSupply = log.args.tokenSupply?.toString()

            const token: TokenData = {
              address: params?.tokenContractAddress as string,
              tokenContractAddress: params?.tokenContractAddress as string,
              creator: params?.creatorAddress as string,
              name: undefined, // Name not available in event
              symbol: undefined, // Symbol not available in event
              totalSupply: tokenSupply,
              timestamp: Number(block.timestamp) * 1000,
              blockNumber: log.blockNumber,
              hash: log.transactionHash,
              isPending: false,
              tokenId,
            }

            // Use setTimeout to ensure async callback execution
            setTimeout(() => callback(token), 0)
          } catch (error) {
            console.error("Error processing log:", error)
          }
        }
      },
    })

    return unwatch
  } catch (error) {
    console.error("Error setting up event subscription:", error)
    return () => {}
  }
}
