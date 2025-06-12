import { createPublicClient, http, parseAbiItem, decodeEventLog, decodeAbiParameters } from "viem"
import { avalanche } from "viem/chains"

const client = createPublicClient({
  chain: avalanche,
  transport: http("https://api.avax.network/ext/bc/C/rpc"),
})

// Arena Launch Contract address
const ARENA_CONTRACT_ADDRESS = "0x8315f1eb449Dd4B779495C3A0b05e5d194446c6e" as const

// Common events we might see in token creation transactions
const TOKEN_CREATED_EVENT = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 totalSupply)",
)

const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)")

// Function signatures for the Arena contract
const METHOD_SIGNATURES = {
  "0x0b8c6fec": "createToken(string,string,uint256,uint256)",
  "0x30f51a46": "createToken(uint16,uint8,uint128,uint8,address,uint256,string,string,uint256)",
  "0x5a46f06c": "createLP(address,uint256)",
  "0xa6f2ae3a": "buy(address)",
  // Add more as you discover them
}

export interface TransactionAnalysis {
  hash: string
  blockNumber: bigint
  timestamp: number
  from: string
  to: string | null
  value: string
  gasUsed: bigint
  gasPrice: bigint
  status: "success" | "failed"
  method: {
    id: string
    name: string
    params?: any
  }
  events: Array<{
    type: string
    address: string
    data: any
    logIndex: number
  }>
  tokenCreated?: {
    tokenAddress: string
    creator: string
    name: string
    symbol: string
    totalSupply: string
  }
  transfers?: Array<{
    from: string
    to: string
    value: string
    tokenAddress: string
  }>
}

export async function analyzeTransaction(txHash: string): Promise<TransactionAnalysis | null> {
  try {
    // Fetch transaction details
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` })
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
    const block = await client.getBlock({ blockNumber: tx.blockNumber! })

    // Determine method
    const methodId = tx.input.slice(0, 10)
    const methodName = METHOD_SIGNATURES[methodId as keyof typeof METHOD_SIGNATURES] || "unknown"

    // Try to decode method parameters (simplified)
    let methodParams = undefined
    if (methodId === "0x0b8c6fec") {
      // Original createToken
      try {
        // This is a simplified approach - in reality you'd use the full ABI
        const types = ["string", "string", "uint256", "uint256"]
        const data = `0x${tx.input.slice(10)}`
        const decoded = decodeAbiParameters(
          [
            { name: "name", type: "string" },
            { name: "symbol", type: "string" },
            { name: "totalSupply", type: "uint256" },
            { name: "taxPercentage", type: "uint256" },
          ],
          data,
        )
        methodParams = {
          name: decoded[0],
          symbol: decoded[1],
          totalSupply: decoded[2].toString(),
          taxPercentage: decoded[3].toString(),
        }
      } catch (e) {
        console.error("Error decoding method parameters:", e)
      }
    } else if (methodId === "0x30f51a46") {
      // New createToken format
      try {
        const data = `0x${tx.input.slice(10)}`
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
        methodParams = {
          param1: decoded[0],
          param2: decoded[1],
          param3: decoded[2].toString(),
          param4: decoded[3],
          creator: decoded[4],
          param6: decoded[5].toString(),
          name: decoded[6],
          symbol: decoded[7],
          totalSupply: decoded[8].toString(),
        }
      } catch (e) {
        console.error("Error decoding new createToken parameters:", e)
      }
    }

    const analysis: TransactionAnalysis = {
      hash: tx.hash,
      blockNumber: tx.blockNumber!,
      timestamp: Number(block.timestamp) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      gasUsed: receipt.gasUsed,
      gasPrice: tx.gasPrice || 0n,
      status: receipt.status === "success" ? "success" : "failed",
      method: {
        id: methodId,
        name: methodName,
        params: methodParams,
      },
      events: [],
      transfers: [],
    }

    // Analyze logs/events
    for (const log of receipt.logs) {
      try {
        // Try to decode as TokenCreated event
        if (log.address.toLowerCase() === ARENA_CONTRACT_ADDRESS.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: [TOKEN_CREATED_EVENT],
              data: log.data,
              topics: log.topics,
            })

            if (decoded.eventName === "TokenCreated") {
              analysis.tokenCreated = {
                tokenAddress: decoded.args.token as string,
                creator: decoded.args.creator as string,
                name: decoded.args.name as string,
                symbol: decoded.args.symbol as string,
                totalSupply: decoded.args.totalSupply?.toString() || "0",
              }

              analysis.events.push({
                type: "TokenCreated",
                address: log.address,
                data: decoded.args,
                logIndex: log.logIndex || 0,
              })
            }
          } catch (e) {
            // Not a TokenCreated event, continue
          }
        }

        // Try to decode as Transfer event
        try {
          const decoded = decodeEventLog({
            abi: [TRANSFER_EVENT],
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === "Transfer") {
            const transfer = {
              from: decoded.args.from as string,
              to: decoded.args.to as string,
              value: decoded.args.value?.toString() || "0",
              tokenAddress: log.address,
            }

            analysis.transfers!.push(transfer)

            analysis.events.push({
              type: "Transfer",
              address: log.address,
              data: decoded.args,
              logIndex: log.logIndex || 0,
            })
          }
        } catch (e) {
          // Not a Transfer event, continue
        }

        // Add other event types as raw logs if we can't decode them
        if (analysis.events.find((e) => e.logIndex === (log.logIndex || 0))) continue

        analysis.events.push({
          type: "Unknown",
          address: log.address,
          data: {
            topics: log.topics,
            data: log.data,
          },
          logIndex: log.logIndex || 0,
        })
      } catch (error) {
        console.error("Error decoding log:", error)
      }
    }

    return analysis
  } catch (error) {
    console.error("Error analyzing transaction:", error)
    return null
  }
}

// Analyze the specific transaction mentioned by the user
export async function analyzeSpecificTransaction(): Promise<TransactionAnalysis | null> {
  const txHash = "0x187a95a25fa18e2c27817c0778aaa285cb197a6b9673b901564852892e1b2406"
  return analyzeTransaction(txHash)
}
