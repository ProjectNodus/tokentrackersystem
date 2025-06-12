"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, ExternalLink, Copy, Check } from "lucide-react"
import { analyzeTransaction, analyzeSpecificTransaction, type TransactionAnalysis } from "@/lib/transaction-analyzer"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export function TransactionAnalyzer() {
  const [analysis, setAnalysis] = useState<TransactionAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAnalyze = async (hash?: string) => {
    const hashToAnalyze = hash || txHash
    if (!hashToAnalyze) return

    setLoading(true)
    try {
      const result = await analyzeTransaction(hashToAnalyze)
      setAnalysis(result)
    } catch (error) {
      console.error("Error analyzing transaction:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadExampleTransaction = async () => {
    setLoading(true)
    try {
      const result = await analyzeSpecificTransaction()
      setAnalysis(result)
    } catch (error) {
      console.error("Error loading example transaction:", error)
    } finally {
      setLoading(false)
    }
  }

  // Format transaction hash to show first 5 and last 6 characters
  const formatTxHash = (hash: string) => {
    if (hash.length < 12) return hash
    return `${hash.substring(0, 5)}...${hash.substring(hash.length - 6)}`
  }

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedHash(text)
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Analyzer</CardTitle>
          <CardDescription>Analyze token creation transactions to understand what happens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter transaction hash (0x...)"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => handleAnalyze()} disabled={loading || !txHash}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Analyze
            </Button>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={loadExampleTransaction} disabled={loading}>
              Load Example Transaction
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                Transaction Analysis
                <span
                  className="font-mono text-sm cursor-pointer hover:text-blue-600 transition-colors"
                  title={analysis.hash}
                  onClick={() => copyToClipboard(analysis.hash)}
                >
                  {formatTxHash(analysis.hash)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(analysis.hash)}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  {copiedHash === analysis.hash ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Badge variant={analysis.status === "success" ? "default" : "destructive"}>{analysis.status}</Badge>
            </CardTitle>
            <CardDescription>
              Block {analysis.blockNumber.toString()} •{" "}
              {formatDistanceToNow(new Date(analysis.timestamp), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Transaction Info */}
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">From:</span>
                  <div className="font-mono break-all flex items-center gap-2">
                    <span title={analysis.from}>{formatTxHash(analysis.from)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysis.from)}
                      className="h-4 w-4 p-0"
                    >
                      {copiedHash === analysis.from ? (
                        <Check className="h-2 w-2 text-green-600" />
                      ) : (
                        <Copy className="h-2 w-2" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">To:</span>
                  <div className="font-mono break-all flex items-center gap-2">
                    <span title={analysis.to || "Contract Creation"}>
                      {analysis.to ? formatTxHash(analysis.to) : "Contract Creation"}
                    </span>
                    {analysis.to && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(analysis.to!)}
                        className="h-4 w-4 p-0"
                      >
                        {copiedHash === analysis.to ? (
                          <Check className="h-2 w-2 text-green-600" />
                        ) : (
                          <Copy className="h-2 w-2" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Value:</span>
                  <div>{formatAvax(analysis.value)} AVAX</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Gas Used:</span>
                  <div>{analysis.gasUsed.toString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <div>{analysis.method.name}</div>
                </div>
              </div>

              {/* Method Parameters */}
              {analysis.method.params && (
                <Card className="bg-muted/50">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Method Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <pre className="text-xs overflow-auto p-2">{JSON.stringify(analysis.method.params, null, 2)}</pre>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" size="sm" asChild className="w-fit">
                <a
                  href={`https://snowtrace.io/tx/${analysis.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  View on Snowtrace <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </div>

            {/* Token Creation Details */}
            {analysis.tokenCreated && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Token Created</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Token Name:</span>
                      <div className="font-semibold">{analysis.tokenCreated.name}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>
                      <div className="font-semibold">{analysis.tokenCreated.symbol}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Supply:</span>
                      <div>{Number(analysis.tokenCreated.totalSupply).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Creator:</span>
                      <div className="font-mono text-xs break-all flex items-center gap-2">
                        <span title={analysis.tokenCreated.creator}>{formatTxHash(analysis.tokenCreated.creator)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(analysis.tokenCreated!.creator)}
                          className="h-4 w-4 p-0"
                        >
                          {copiedHash === analysis.tokenCreated.creator ? (
                            <Check className="h-2 w-2 text-green-600" />
                          ) : (
                            <Copy className="h-2 w-2" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild className="w-fit">
                    <a
                      href={`https://snowtrace.io/address/${analysis.tokenCreated.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      View Token Contract <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Transfer Events */}
            {analysis.transfers && analysis.transfers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Token Transfers</CardTitle>
                  <CardDescription>{analysis.transfers.length} transfer(s) detected</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.transfers.map((transfer, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">From:</span>
                            <div className="font-mono text-xs break-all">
                              {transfer.from === "0x0000000000000000000000000000000000000000"
                                ? "Mint"
                                : formatTxHash(transfer.from)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">To:</span>
                            <div className="font-mono text-xs break-all">{formatTxHash(transfer.to)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <div>{Number(transfer.value).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Events</CardTitle>
                <CardDescription>{analysis.events.length} event(s) detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.events.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{event.type}</Badge>
                        <span className="font-mono text-xs" title={event.address}>
                          {formatTxHash(event.address)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">Log #{event.logIndex}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
