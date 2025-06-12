"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

// Initialize Supabase client using validated env variables
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Creator = {
  wallet_address: string
  contracts_created: number
  contract_tickers: {
    symbol: string
    name: string
    address: string
    transaction_hash: string
    created_at: string
  }[]
  first_seen_at: string
  last_contract_at: string
}

export function CreatorsDashboard() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stats, setStats] = useState({
    totalCreators: 0,
    totalContracts: 0,
    avgContractsPerCreator: 0,
  })

  useEffect(() => {
    async function fetchCreators() {
      try {
        setLoading(true)

        // Fetch creators ordered by contracts_created in descending order
        const { data, error } = await supabase
          .from("creators")
          .select("*")
          .order("contracts_created", { ascending: false })

        if (error) throw error

        if (data) {
          setCreators(data)

          // Calculate stats
          const totalCreators = data.length
          const totalContracts = data.reduce((sum, creator) => sum + creator.contracts_created, 0)
          const avgContractsPerCreator = totalCreators > 0 ? totalContracts / totalCreators : 0

          setStats({
            totalCreators,
            totalContracts,
            avgContractsPerCreator,
          })
        }
      } catch (error) {
        console.error("Error fetching creators:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCreators()

    // Set up real-time subscription for updates
    const subscription = supabase
      .channel("creators-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "creators",
        },
        fetchCreators,
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Filter creators based on search term
  const filteredCreators = creators.filter((creator) => {
    if (!searchTerm) return true

    // Search by wallet address
    if (creator.wallet_address.toLowerCase().includes(searchTerm.toLowerCase())) {
      return true
    }

    // Search by ticker symbols
    return creator.contract_tickers.some(
      (ticker) =>
        ticker.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticker.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  })

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return ""
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCreators}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Contracts/Creator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgContractsPerCreator.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token Creators</CardTitle>
          <CardDescription>Overview of all creators who have deployed tokens on Arena</CardDescription>
          <Input
            placeholder="Search by address or ticker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mt-2"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">Loading creators data...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Contracts</TableHead>
                  <TableHead>Recent Tickers</TableHead>
                  <TableHead>First Seen</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No creators found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCreators.map((creator) => (
                    <TableRow key={creator.wallet_address}>
                      <TableCell className="font-mono">{formatAddress(creator.wallet_address)}</TableCell>
                      <TableCell>{creator.contracts_created}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {creator.contract_tickers.slice(0, 3).map((ticker, i) => (
                            <Badge key={i} variant="outline">
                              {ticker.symbol}
                            </Badge>
                          ))}
                          {creator.contract_tickers.length > 3 && (
                            <Badge variant="outline">+{creator.contract_tickers.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(creator.first_seen_at).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(creator.last_contract_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
