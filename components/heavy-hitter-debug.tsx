"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { fetchArenaUserProfile, formatAvaxValue } from "@/lib/arena-socials"
import type { ArenaUserProfile } from "@/lib/arena-socials"

export function HeavyHitterDebug() {
  const [walletAddress, setWalletAddress] = useState("")
  const [profile, setProfile] = useState<ArenaUserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHeavyHitter = (profile: ArenaUserProfile | null): { isHeavy: boolean; reasons: string[] } => {
    if (!profile) {
      return { isHeavy: false, reasons: [] }
    }

    const reasons: string[] = []
    const followers = profile.followerCount || 0
    const keyPrice = profile.keyPrice ? Number(profile.keyPrice) / 1e18 : 0

    // Check follower threshold (5000+)
    if (followers >= 5000) {
      reasons.push(`${followers.toLocaleString()} followers (≥5000 threshold)`)
    }

    // Check ticket price threshold (1.5+ AVAX)
    if (keyPrice >= 1.5) {
      reasons.push(`${keyPrice.toFixed(2)} AVAX ticket price (≥1.5 threshold)`)
    }

    return {
      isHeavy: reasons.length > 0,
      reasons,
    }
  }

  const handleCheck = async () => {
    if (!walletAddress.trim()) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setProfile(null)

    try {
      console.log(`🔍 Checking heavy hitter status for: ${walletAddress}`)
      const fetchedProfile = await fetchArenaUserProfile(walletAddress.trim())
      setProfile(fetchedProfile)

      if (fetchedProfile) {
        const heavyHitterStatus = checkHeavyHitter(fetchedProfile)
        console.log(`🚀 Heavy hitter analysis:`, heavyHitterStatus)
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError("Failed to fetch Arena profile")
    } finally {
      setLoading(false)
    }
  }

  const heavyHitterStatus = checkHeavyHitter(profile)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🚀 Heavy Hitter Debug Tool</CardTitle>
        <CardDescription>
          Check if a creator qualifies as a "heavy hitter" (≥5000 followers OR ≥1.5 AVAX ticket price)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter wallet address (0x...)"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCheck} disabled={loading}>
            {loading ? "Checking..." : "Check Status"}
          </Button>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}

        {profile && (
          <div className="space-y-4">
            <Separator />

            {/* Heavy Hitter Status */}
            <div className="flex items-center gap-2">
              <Badge variant={heavyHitterStatus.isHeavy ? "default" : "secondary"} className="text-sm">
                {heavyHitterStatus.isHeavy ? "🚀 HEAVY HITTER" : "👤 Regular Creator"}
              </Badge>
              {profile.isArenaChampion && (
                <Badge variant="outline" className="text-sm">
                  🏆 Arena Champion
                </Badge>
              )}
            </div>

            {/* Profile Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Username:</strong> @{profile.username || "N/A"}
              </div>
              <div>
                <strong>Display Name:</strong> {profile.displayName || "N/A"}
              </div>
              <div>
                <strong>Arena Followers:</strong> {profile.followerCount?.toLocaleString() || "N/A"}
              </div>
              <div>
                <strong>Twitter Followers:</strong> {profile.twitterFollowerCount?.toLocaleString() || "N/A"}
              </div>
              <div>
                <strong>Ticket Price:</strong> {profile.keyPrice ? `${formatAvaxValue(profile.keyPrice)} AVAX` : "N/A"}
              </div>
              <div>
                <strong>Total Holders:</strong> {profile.totalHolders || "N/A"}
              </div>
            </div>

            {/* Heavy Hitter Analysis */}
            <div className="space-y-2">
              <strong>Heavy Hitter Analysis:</strong>
              <div className="space-y-1 text-sm">
                <div
                  className={`p-2 rounded ${profile.followerCount && profile.followerCount >= 5000 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}`}
                >
                  Followers: {profile.followerCount?.toLocaleString() || 0}{" "}
                  {profile.followerCount && profile.followerCount >= 5000 ? "✅ (≥5000)" : "❌ (<5000)"}
                </div>
                <div
                  className={`p-2 rounded ${profile.keyPrice && Number(profile.keyPrice) / 1e18 >= 1.5 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}`}
                >
                  Ticket Price: {profile.keyPrice ? `${formatAvaxValue(profile.keyPrice)} AVAX` : "0 AVAX"}{" "}
                  {profile.keyPrice && Number(profile.keyPrice) / 1e18 >= 1.5 ? "✅ (≥1.5)" : "❌ (<1.5)"}
                </div>
              </div>
            </div>

            {/* Qualifying Reasons */}
            {heavyHitterStatus.reasons.length > 0 && (
              <div className="space-y-2">
                <strong>Qualifying Reasons:</strong>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {heavyHitterStatus.reasons.map((reason, index) => (
                    <li key={index} className="text-green-700">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample Post Preview */}
            <div className="space-y-2">
              <strong>Sample Post Preview:</strong>
              <div className="p-3 bg-gray-50 rounded-md text-sm border">
                {profile.isArenaChampion ? (
                  <div className="text-purple-700">
                    🏆 Arena Champion @{profile.username} just launched a new token: $EXAMPLE.
                    <br />
                    <br />
                    This might be worth watching closely 👀
                  </div>
                ) : heavyHitterStatus.isHeavy ? (
                  <div className="text-blue-700">
                    🚀 A heavy hitter just dropped: @{profile.username} launched $EXAMPLE.
                    <br />
                    <br />
                    {profile.followerCount?.toLocaleString() || 0} followers. Ticket:{" "}
                    {profile.keyPrice ? formatAvaxValue(profile.keyPrice) : "0"} AVAX.
                    <br />
                    <br />
                    This is their first token — all eyes on the debut.
                  </div>
                ) : (
                  <div className="text-gray-700">
                    ⚠️ALERT⚠️
                    <br />
                    <br />@{profile.username} has just launched the token EXAMPLE on arenabook.xyz. This is their 2nd
                    token so far.
                    <br />
                    <br />
                    Stay sharp!⚠️
                  </div>
                )}
              </div>
            </div>

            {/* Debug Info */}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
