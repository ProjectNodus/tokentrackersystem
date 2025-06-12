"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  fetchArenaUserProfile,
  formatAvaxValue,
  clearArenaProfileCache,
  testApiConnectivity,
  type ArenaUserProfile,
} from "@/lib/arena-socials"

interface ProfileDebugProps {
  address: string
}

export function ProfileDebug({ address }: ProfileDebugProps) {
  const [profile, setProfile] = useState<ArenaUserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectivity, setConnectivity] = useState<{ arena: boolean; starsarena: boolean } | null>(null)

  const testProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log(`🔍 Testing profile fetch for: ${address}`)

      // Clear cache first to ensure fresh data
      clearArenaProfileCache()

      const result = await fetchArenaUserProfile(address)
      setProfile(result)

      if (result) {
        console.log(`✅ Profile result:`, result)
        if (result.keyPrice) {
          console.log(`💰 Key price found: ${result.keyPrice} (${formatAvaxValue(result.keyPrice)} AVAX)`)
        }
        if (result.totalHolders) {
          console.log(`👥 Total holders: ${result.totalHolders}`)
        }
        if (result.volume) {
          console.log(`📊 Volume: ${result.volume} (${formatAvaxValue(result.volume)} AVAX)`)
        }
      } else {
        console.log(`❌ No profile found`)
      }
    } catch (err) {
      console.error(`❌ Error:`, err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const testConnectivity = async () => {
    setLoading(true)
    try {
      const results = await testApiConnectivity()
      setConnectivity(results)
      console.log("API Connectivity results:", results)
    } catch (err) {
      console.error("Connectivity test failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-2 border-orange-200 bg-orange-50">
      <CardHeader className="py-2">
        <CardTitle className="text-sm">Profile Debug</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={testProfile} disabled={loading}>
              {loading ? "Testing..." : "Test Profile Fetch"}
            </Button>
            <Button size="sm" variant="outline" onClick={testConnectivity} disabled={loading}>
              Test Connectivity
            </Button>
          </div>

          {connectivity && (
            <div className="text-xs bg-blue-50 p-2 rounded">
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <span>Arena.trade:</span>
                  <Badge variant={connectivity.arena ? "default" : "destructive"}>
                    {connectivity.arena ? "✅ Online" : "❌ Offline"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span>StarsArena:</span>
                  <Badge variant={connectivity.starsarena ? "default" : "destructive"}>
                    {connectivity.starsarena ? "✅ Online" : "❌ Offline"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">Error: {error}</div>}

          {profile && (
            <div className="text-xs bg-green-50 p-2 rounded">
              <div>
                <strong>Username:</strong> {profile.username || "N/A"}
              </div>
              <div>
                <strong>Display Name:</strong> {profile.displayName || "N/A"}
              </div>
              <div>
                <strong>Key Price:</strong> {profile.keyPrice ? `${formatAvaxValue(profile.keyPrice)} AVAX` : "N/A"}
              </div>
              <div>
                <strong>Twitter Followers:</strong> {profile.followerCount || "N/A"}
              </div>
              <div>
                <strong>Arena Holders:</strong> {profile.totalHolders || "N/A"}
              </div>
              <div>
                <strong>Volume:</strong> {profile.volume ? `${formatAvaxValue(profile.volume)} AVAX` : "N/A"}
              </div>
              <div>
                <strong>Supply:</strong> {profile.supply || "N/A"}
              </div>
            </div>
          )}

          {profile === null && !loading && !error && (
            <div className="text-xs text-gray-600">No profile data yet. Click "Test Profile Fetch" to try.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
