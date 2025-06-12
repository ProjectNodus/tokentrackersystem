"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  CheckCircle,
  ArrowRightLeft,
  Copy,
  Check,
  Coins,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  fetchContractTransactions,
  subscribeToContractTransactions,
  type ContractTransaction,
  type TransactionType,
} from "@/lib/blockchain"
import { MonitoringStatus } from "./monitoring-status"
import { CreatorProfile } from "./creator-profile"
// Add the database status component and enhanced monitoring
// Import the new components at the top
import { DatabaseStatus } from "./database-status"
import { createDatabaseSavingCallback } from "@/lib/blockchain-enhanced"

export default function ContractTransactions() {
  const [transactions, setTransactions] = useState<ContractTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBlock, setCurrentBlock] = useState<bigint>(0n)
  const [filter] = useState<TransactionType | "ALL">("TOKEN_CREATION") // Default to TOKEN_CREATION, removed setter
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [newTransactionCount, setNewTransactionCount] = useState(0)
  const { toast } = useToast()

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true)

  // Stable reference for addNewTransaction
  const addNewTransaction = useCallback(
    (newTx: ContractTransaction) => {
      // Check if component is still mounted
      if (!isMountedRef.current) return

      // Only add if it matches the current filter or if filter is ALL
      if (filter !== "ALL" && newTx.transactionType !== filter) return

      setTransactions((prevTxs) => {
        // Check if transaction already exists
        const existingIndex = prevTxs.findIndex((tx) => tx.hash === newTx.hash)

        if (existingIndex >= 0) {
          // Update existing transaction (might have new profile data)
          const updatedTxs = [...prevTxs]
          updatedTxs[existingIndex] = { ...updatedTxs[existingIndex], ...newTx }

          // Log profile updates
          if (newTx.creatorProfile?.arenaProfile) {
            console.log(`🔄 Updated profile for transaction ${newTx.hash}:`, newTx.creatorProfile.arenaProfile)
          }

          return updatedTxs
        }

        // Add new transaction to the beginning of the list
        const newList = [newTx, ...prevTxs.slice(0, 99)] // Keep only last 100 transactions

        // Update counters for truly new transactions
        setNewTransactionCount((prev) => prev + 1)
        setCurrentBlock((prevBlock) => (newTx.blockNumber > prevBlock ? newTx.blockNumber : prevBlock))

        // Show notification
        toast({
          title: `🔥 New ${newTx.transactionType.replace("_", " ")}`,
          description: `${newTx.description} - Block ${newTx.blockNumber.toString()}`,
          duration: 5000,
        })

        return newList
      })
    },
    [filter, toast],
  )

  // Stable reference for fetchData
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return

    setLoading(true)
    try {
      console.log("Fetching contract transactions...")
      // Pass the filter to only fetch token creation transactions
      const txs = await fetchContractTransactions(50, filter === "ALL" ? undefined : filter)

      if (!isMountedRef.current) return

      console.log(`Fetched ${txs.length} transactions`)
      setTransactions(txs)
      setNewTransactionCount(0) // Reset counter after manual refresh

      // Update current block
      if (txs.length > 0) {
        const highestBlock = txs.reduce((max, tx) => (tx.blockNumber > max ? tx.blockNumber : max), 0n)
        setCurrentBlock(highestBlock)
      }
    } catch (error) {
      console.error("Error fetching contract transactions:", error)
      if (isMountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to fetch contract transactions. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [filter, toast])

  // Initial setup effect - runs only once
  useEffect(() => {
    isMountedRef.current = true
    console.log("Component mounted, starting initial fetch...")

    // Initial data fetch
    fetchData()

    // Set up real-time monitoring with database saving
    const databaseCallback = createDatabaseSavingCallback()

    // Combine both callbacks
    const combinedCallback = (tx: ContractTransaction) => {
      addNewTransaction(tx)
      databaseCallback(tx) // Save to database
    }

    const unsubscribe = subscribeToContractTransactions(combinedCallback)

    return () => {
      console.log("Component unmounting...")
      isMountedRef.current = false
      unsubscribe()
    }
  }, [])

  // Separate effect for when we need to refetch manually
  const handleRefresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  // Format transaction hash to show first 5 and last 6 characters
  const formatTxHash = (hash: string) => {
    if (hash.length < 12) return hash
    return `${hash.substring(0, 5)}...${hash.substring(hash.length - 6)}`
  }

  // Copy transaction hash to clipboard
  const copyToClipboard = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedHash(hash)
      toast({
        title: "Copied!",
        description: "Transaction hash copied to clipboard",
      })
      setTimeout(() => setCopiedHash(null), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  // Format AVAX value
  const formatAvax = (value: string) => {
    const avaxValue = Number(value) / 1e18
    return avaxValue.toFixed(avaxValue < 0.0001 ? 8 : 4)
  }

  // Get icon for transaction type
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "TOKEN_CREATION":
        return <Plus className="h-4 w-4" />
      case "BUY":
        return <TrendingUp className="h-4 w-4" />
      case "SELL":
        return <TrendingDown className="h-4 w-4" />
      case "ADD_LIQUIDITY":
        return <Plus className="h-4 w-4" />
      case "REMOVE_LIQUIDITY":
        return <Minus className="h-4 w-4" />
      case "APPROVE":
        return <CheckCircle className="h-4 w-4" />
      case "TRANSFER":
        return <ArrowRightLeft className="h-4 w-4" />
      default:
        return <ArrowRightLeft className="h-4 w-4" />
    }
  }

  // Get color for transaction type
  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case "TOKEN_CREATION":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "BUY":
        return "bg-green-100 text-green-800 border-green-200"
      case "SELL":
        return "bg-red-100 text-red-800 border-red-200"
      case "ADD_LIQUIDITY":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "REMOVE_LIQUIDITY":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "APPROVE":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "TRANSFER":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get token contract address from transaction
  const getTokenAddress = (tx: ContractTransaction): string | null => {
    // First try to get it from tokenMetadata
    if (tx.tokenMetadata?.tokenAddress) {
      return tx.tokenMetadata.tokenAddress
    }

    // If we have tokenCreated in the transaction analysis
    if (tx.tokenCreated?.tokenAddress) {
      return tx.tokenCreated.tokenAddress
    }

    // For debugging - log what we have
    console.log(`Token address not found for tx ${tx.hash}:`, {
      hasMetadata: !!tx.tokenMetadata,
      metadata: tx.tokenMetadata,
      hasTokenCreated: !!tx.tokenCreated,
    })

    // We don't use the transaction hash as fallback anymore
    return null
  }

  // Filter transactions (since we're only fetching TOKEN_CREATION, this should be all of them)
  const filteredTransactions = transactions

  if (loading) {
    return (
      <div className="space-y-6">
        <MonitoringStatus />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading token creations...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Real-time Monitoring Status */}
      <MonitoringStatus />

      {/* Database Status */}
      <DatabaseStatus />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Token Creations
            {newTransactionCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                +{newTransactionCount} new
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest block: {currentBlock.toString()} • {transactions.length} tokens found
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No token creations found. Real-time monitoring is active...
          <br />
          <Button variant="outline" onClick={handleRefresh} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTransactions.map((tx, index) => {
            const tokenAddress = getTokenAddress(tx)

            return (
              <Card
                key={tx.hash}
                className={`transition-all hover:shadow-md ${
                  index < newTransactionCount ? "ring-2 ring-green-500 ring-opacity-50" : ""
                } border-purple-200 bg-purple-50/30`}
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground">Txn Hash:</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-mono text-sm cursor-pointer hover:text-blue-600 transition-colors"
                          title={tx.hash}
                          onClick={() => copyToClipboard(tx.hash)}
                        >
                          {formatTxHash(tx.hash)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(tx.hash)}
                          className="h-6 w-6 p-0 hover:bg-gray-100"
                        >
                          {copiedHash === tx.hash ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {index < newTransactionCount && (
                        <Badge variant="destructive" className="animate-pulse">
                          NEW
                        </Badge>
                      )}
                      <Badge className={`flex items-center gap-1 ${getTransactionColor(tx.transactionType)}`}>
                        {getTransactionIcon(tx.transactionType)}
                        TOKEN CREATION
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-4">
                  {/* Token Metadata */}
                  {tx.tokenMetadata && (
                    <div className="p-3 bg-white rounded-lg border border-purple-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{tx.tokenMetadata.name || "Unnamed Token"}</h3>
                          <p className="text-sm text-muted-foreground">{tx.tokenMetadata.symbol || "???"}</p>
                        </div>
                        {tx.tokenMetadata.totalSupply && (
                          <Badge variant="outline" className="bg-purple-50">
                            {Number(tx.tokenMetadata.totalSupply).toLocaleString()} tokens
                          </Badge>
                        )}
                      </div>
                      {tx.tokenMetadata.tokenAddress && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <span>Token:</span>
                          <span className="font-mono" title={tx.tokenMetadata.tokenAddress}>
                            {formatTxHash(tx.tokenMetadata.tokenAddress)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(tx.tokenMetadata!.tokenAddress)}
                            className="h-4 w-4 p-0"
                          >
                            <Copy className="h-2 w-2" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Creator Profile */}
                  {tx.creatorProfile && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Creator</h4>
                      <CreatorProfile creatorProfile={tx.creatorProfile} compact />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Creator Address:</span>
                      <div className="font-mono truncate" title={tx.from}>
                        {formatTxHash(tx.from)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value:</span>
                      <div className={`font-semibold ${Number(tx.value) > 0 ? "text-green-600" : "text-gray-500"}`}>
                        {formatAvax(tx.value)} AVAX
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Block:</span>
                      <div className="font-mono">{tx.blockNumber.toString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <div>
                        {tx.timestamp ? formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true }) : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Method ID Information */}
                  {tx.methodId && (
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Method ID:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{tx.methodId}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(tx.methodId!)}
                            className="h-4 w-4 p-0"
                          >
                            {copiedHash === tx.methodId ? (
                              <Check className="h-2 w-2 text-green-600" />
                            ) : (
                              <Copy className="h-2 w-2" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(tx.hash)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Hash
                      </Button>

                      {/* Arena Trade Token Button - Only show if we have a token address */}
                      {tokenAddress && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="bg-blue-50 border-blue-200 hover:bg-blue-100"
                        >
                          <a
                            href={`https://arena.trade/token/${tokenAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <Coins className="h-3 w-3" />
                            View on Arena
                          </a>
                        </Button>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`https://snowtrace.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        View on Snowtrace <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
