"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { fetchTokens } from "@/lib/blockchain"

export function TokenStats() {
  const [stats, setStats] = useState({
    total24h: 0,
    total7d: 0,
    avgSupply: "0",
    loading: true,
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const tokens = await fetchTokens()

        // Calculate statistics
        const now = Date.now()
        const oneDay = 24 * 60 * 60 * 1000
        const oneWeek = 7 * oneDay

        const tokens24h = tokens.filter((t) => (t.timestamp || 0) > now - oneDay)
        const tokens7d = tokens.filter((t) => (t.timestamp || 0) > now - oneWeek)

        // Calculate average supply
        const totalSupply = tokens.reduce((sum, token) => {
          return sum + BigInt(token.totalSupply || "0")
        }, BigInt(0))

        const avgSupply = tokens.length > 0 ? (totalSupply / BigInt(tokens.length)).toString() : "0"

        setStats({
          total24h: tokens24h.length,
          total7d: tokens7d.length,
          avgSupply,
          loading: false,
        })
      } catch (error) {
        console.error("Error loading stats:", error)
        setStats((prev) => ({ ...prev, loading: false }))
      }
    }

    loadStats()
  }, [])

  if (stats.loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading statistics...</span>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Created (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total24h}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Created (7d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total7d}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Token Supply</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Number(stats.avgSupply).toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  )
}
