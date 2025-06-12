"use client"

import { useEffect, useState, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchTokens, fetchPendingTransactions, subscribeToTokenCreations, type TokenData } from "@/lib/blockchain"
import { useToast } from "@/hooks/use-toast"
import { processTokenCreation } from "@/lib/database-simple"

interface TokenListProps {
  type: "recent" | "pending"
}

export default function TokenList({ type }: TokenListProps) {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const addNewToken = useCallback(
    (newToken: TokenData) => {
      setTokens((prevTokens) => {
        // Check if token already exists in the list
        const exists = prevTokens.some((token) => token.address === newToken.address || token.hash === newToken.hash)

        if (exists) {
          return prevTokens
        }

        // Show notification for new tokens
        toast({
          title: "New Token Created",
          description: `${newToken.name || "New token"} (${newToken.symbol || "Unknown"}) has been created`,
        })

        // Process token creation for database storage
        if (newToken.creator && newToken.symbol) {
          processTokenCreation({
            from: newToken.creator,
            hash: newToken.hash || "",
            isTokenCreation: true,
            tokenMetadata: {
              name: newToken.name || "",
              symbol: newToken.symbol,
              tokenAddress: newToken.address || "",
            },
            tokenAddress: newToken.address || "",
          }).catch((error) => {
            console.error("Error processing token creation for database:", error)
          })
        }

        // Add new token to the beginning of the list
        return [newToken, ...prevTokens]
      })
    },
    [toast],
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (type === "recent") {
        const recentTokens = await fetchTokens()
        setTokens(recentTokens)
      } else {
        const pendingTokens = await fetchPendingTransactions()
        setTokens(pendingTokens)
      }
    } catch (error) {
      console.error("Error fetching token data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch token data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [type, toast])

  useEffect(() => {
    fetchData()

    // Set up polling for updates
    const interval = setInterval(fetchData, 30000) // Poll every 30 seconds

    // Set up real-time event subscription for recent tokens
    let unsubscribe: () => void
    if (type === "recent") {
      unsubscribe = subscribeToTokenCreations(addNewToken)
    }

    return () => {
      clearInterval(interval)
      if (unsubscribe) unsubscribe()
    }
  }, [type, fetchData, addNewToken])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading {type} tokens...</span>
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No {type} token creations found.
        <Button variant="outline" onClick={fetchData} className="ml-2">
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {type === "recent" ? "Recent Token Creations" : "Pending Transactions"}
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tokens.map((token) => (
          <Card key={token.address || token.hash || Math.random().toString()}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    {token.name || `Token #${token.tokenId || "Unknown"}`}
                    {token.isPending && (
                      <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{token.symbol || "Processing..."}</CardDescription>
                </div>
                {token.totalSupply && (
                  <Badge variant="secondary">{Number(token.totalSupply).toLocaleString()} tokens</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creator:</span>
                  <span className="font-mono truncate max-w-[180px]" title={token.creator}>
                    {token.creator
                      ? `${token.creator.substring(0, 6)}...${token.creator.substring(token.creator.length - 4)}`
                      : "Unknown"}
                  </span>
                </div>

                {token.tokenId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token ID:</span>
                    <span>#{token.tokenId}</span>
                  </div>
                )}

                {token.timestamp && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDistanceToNow(new Date(token.timestamp), { addSuffix: true })}</span>
                  </div>
                )}

                <div className="mt-4 flex justify-between gap-2">
                  {/* Arena button - only show if we have a token contract address */}
                  {(token.tokenContractAddress || token.address) && (
                    <Button variant="default" size="sm" asChild>
                      <a
                        href={`https://arenabook.xyz/token/${token.tokenContractAddress || token.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center bg-purple-600 hover:bg-purple-700"
                      >
                        Arena <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}

                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://snowtrace.io/${token.tokenContractAddress || token.address ? "address/" + (token.tokenContractAddress || token.address) : "tx/" + token.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      Snowtrace <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
