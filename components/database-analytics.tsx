"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, TrendingUp, Users, Coins, Database } from "lucide-react"
import { getTokens, getContractTransactions, getTokenStats, type Database as DatabaseTypes } from "@/lib/database"
import { formatDistanceToNow } from "date-fns"

type TokenRow = DatabaseTypes["public"]["Tables"]["tokens"]["Row"]
type ContractTransactionRow = DatabaseTypes["public"]["Tables"]["contract_transactions"]["Row"]

export function DatabaseAnalytics() {
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [transactions, setTransactions] = useState<ContractTransactionRow[]>([])
  const [stats, setStats] = useState({
    total: 0,
    last24h: 0,
    last7d: 0,
    avgSupply: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tokensData, transactionsData, statsData] = await Promise.all([
        getTokens(20),
        getContractTransactions(20, "TOKEN_CREATION"),
        getTokenStats(),
      ])

      setTokens(tokensData)
      setTransactions(transactionsData)
      setStats(statsData)
    } catch (error) {
      console.error("Error fetching database analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading database analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Analytics
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Last 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.last24h.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Last 7d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.last7d.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Avg Supply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSupply.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tokens from Database */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tokens (Database)</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tokens found in database</div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold">{token.name || "Unnamed Token"}</div>
                    <div className="text-sm text-muted-foreground">{token.symbol || "???"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{token.address.substring(0, 10)}...</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {token.total_supply ? Number(token.total_supply).toLocaleString() : "Unknown"} tokens
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(token.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions from Database */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions (Database)</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No transactions found in database</div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-mono text-sm">
                      {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 6)}
                    </div>
                    <div className="text-sm text-muted-foreground">{tx.description}</div>
                    <div className="text-xs text-muted-foreground">Block {tx.block_number.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {tx.transaction_type.replace("_", " ")}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
