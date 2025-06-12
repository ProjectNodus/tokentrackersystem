"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { testDatabaseConnection, getTokenStats } from "@/lib/database"

export function DatabaseStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    last24h: 0,
    last7d: 0,
    avgSupply: 0,
  })
  const [loading, setLoading] = useState(false)

  const checkConnection = async () => {
    setLoading(true)
    try {
      const connected = await testDatabaseConnection()
      setIsConnected(connected)

      if (connected) {
        const tokenStats = await getTokenStats()
        setStats(tokenStats)
      }
    } catch (error) {
      console.error("Error checking database connection:", error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Status
          </div>
          <Badge
            variant={isConnected ? "default" : isConnected === false ? "destructive" : "secondary"}
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <CheckCircle className="h-3 w-3" />
            ) : isConnected === false ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isConnected ? "CONNECTED" : isConnected === false ? "DISCONNECTED" : "CHECKING"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Tokens:</span>
              <div className="font-semibold">{stats.total.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Last 24h:</span>
              <div className="font-semibold">{stats.last24h.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Last 7d:</span>
              <div className="font-semibold">{stats.last7d.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Supply:</span>
              <div className="font-semibold">{stats.avgSupply.toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isConnected
              ? "Supabase database is connected and ready"
              : isConnected === false
                ? "Unable to connect to Supabase database"
                : "Checking database connection..."}
          </div>
          <Button variant="outline" size="sm" onClick={checkConnection} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
