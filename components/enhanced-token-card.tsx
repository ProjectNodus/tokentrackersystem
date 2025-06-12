"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Info, Award, XCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { analyzeTransaction, type TransactionAnalysis } from "@/lib/transaction-analyzer"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { TokenData } from "@/lib/blockchain"
import { getCreator, type Creator } from "@/lib/database-simple"
import { CreatorProfile } from "@/components/creator-profile"

interface EnhancedTokenCardProps {
  token: TokenData
}

export function EnhancedTokenCard({ token }: EnhancedTokenCardProps) {
  const [analysis, setAnalysis] = useState<TransactionAnalysis | null>(null)
  const [creatorData, setCreatorData] = useState<Creator | null>(null)
  const [loadingCreator, setLoadingCreator] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!token.hash && !token.address) return

    setLoading(true)
    try {
      // If we have a hash, analyze that transaction
      // Otherwise, we'd need to find the creation transaction for the token address
      if (token.hash) {
        const result = await analyzeTransaction(token.hash)
        setAnalysis(result)
      }
    } catch (error) {
      console.error("Error analyzing token transaction:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCreatorData = async () => {
    if (!token.creator) return

    setLoadingCreator(true)
    try {
      const creator = await getCreator(token.creator)
      setCreatorData(creator)
    } catch (error) {
      console.error("Error fetching creator data:", error)
    } finally {
      setLoadingCreator(false)
    }
  }

  useEffect(() => {
    fetchCreatorData()
  }, [token.creator])

  // Function to render Arena Champion status
  const renderChampionStatus = (arenaProfile: any) => {
    if (!arenaProfile) return null

    // Check explicitly for badges array and badgeType 19
    let isChampion = false

    if (arenaProfile.badges && Array.isArray(arenaProfile.badges)) {
      isChampion = arenaProfile.badges.some((badge: any) => badge.badgeType === 19)
    }

    if (isChampion) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 flex items-center gap-1 text-xs">
          <Award className="h-3 w-3" />
          Champion
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-gray-500 flex items-center gap-1 text-xs">
          <XCircle className="h-3 w-3" />
          Not Champion
        </Badge>
      )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              {token.name || "New Token"}
              {token.isPending && (
                <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800">
                  Pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{token.symbol || "Processing..."}</CardDescription>
          </div>
          {token.totalSupply && <Badge variant="secondary">{Number(token.totalSupply).toLocaleString()} tokens</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          {/* Creator Profile Section */}
          {token.creatorProfile && (
            <div className="mb-4">
              <span className="text-muted-foreground text-sm block mb-2">Creator</span>
              <CreatorProfile creatorProfile={token.creatorProfile} compact={true} />
            </div>
          )}

          {/* Fallback creator info if no profile available */}
          {!token.creatorProfile && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creator:</span>
                <div className="text-right">
                  <span className="font-mono truncate max-w-[180px] block" title={token.creator}>
                    {token.creator
                      ? `${token.creator.substring(0, 6)}...${token.creator.substring(token.creator.length - 4)}`
                      : "Unknown"}
                  </span>
                </div>
              </div>

              {/* Show Arena Champion status if we have arena profile data */}
              {token.creatorProfile?.arenaProfile && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Arena Status:</span>
                  {renderChampionStatus(token.creatorProfile.arenaProfile)}
                </div>
              )}
            </>
          )}

          {creatorData && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tokens Created:</span>
              <Badge variant="secondary">{creatorData.contracts_created}</Badge>
            </div>
          )}

          {creatorData && creatorData.contract_tickers.length > 0 && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Recent Tickers:</span>
              <div className="flex flex-wrap gap-1">
                {creatorData.contract_tickers.slice(-3).map((ticker, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {ticker.symbol}
                  </Badge>
                ))}
                {creatorData.contract_tickers.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{creatorData.contract_tickers.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {token.timestamp && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDistanceToNow(new Date(token.timestamp), { addSuffix: true })}</span>
            </div>
          )}

          <div className="mt-4 flex justify-between gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading}>
                  <Info className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Token Analysis: {token.name || "Unknown Token"}</DialogTitle>
                </DialogHeader>
                {analysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={analysis.status === "success" ? "default" : "destructive"} className="ml-2">
                          {analysis.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gas Used:</span>
                        <span className="ml-2">{analysis.gasUsed.toString()}</span>
                      </div>
                    </div>

                    {analysis.tokenCreated && (
                      <div className="border rounded-lg p-3">
                        <h4 className="font-semibold mb-2">Token Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Name: {analysis.tokenCreated.name}</div>
                          <div>Symbol: {analysis.tokenCreated.symbol}</div>
                          <div>Supply: {Number(analysis.tokenCreated.totalSupply).toLocaleString()}</div>
                          <div>Creator: {analysis.tokenCreated.creator.substring(0, 10)}...</div>
                        </div>
                      </div>
                    )}

                    {analysis.transfers && analysis.transfers.length > 0 && (
                      <div className="border rounded-lg p-3">
                        <h4 className="font-semibold mb-2">Transfers ({analysis.transfers.length})</h4>
                        <div className="space-y-1 text-xs">
                          {analysis.transfers.slice(0, 3).map((transfer, i) => (
                            <div key={i} className="flex justify-between">
                              <span>
                                {transfer.from.substring(0, 6)}...→{transfer.to.substring(0, 6)}...
                              </span>
                              <span>{Number(transfer.value).toLocaleString()}</span>
                            </div>
                          ))}
                          {analysis.transfers.length > 3 && <div>...and {analysis.transfers.length - 3} more</div>}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {loading
                      ? "Analyzing transaction..."
                      : "Click Details to analyze this token's creation transaction"}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  )
}
