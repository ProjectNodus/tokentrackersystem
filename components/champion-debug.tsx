"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Crown, User, Trophy } from "lucide-react"

interface ChampionTestResult {
  walletAddress: string
  hasProfile: boolean
  username?: string
  displayName?: string
  isChampion: boolean
  badges: number[]
  keyPrice?: string
  totalHolders?: string
  arenaFollowers?: number
  twitterFollowers?: number
}

export default function ChampionDebug() {
  const [walletAddress, setWalletAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ChampionTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testChampionStatus = async () => {
    if (!walletAddress.trim()) {
      setError("Please enter a wallet address")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Import the function dynamically to avoid SSR issues
      const { fetchArenaUserProfile } = await import("@/lib/arena-socials")

      console.log(`🧪 Testing Champion status for: ${walletAddress}`)

      const profile = await fetchArenaUserProfile(walletAddress.trim())

      if (profile) {
        const testResult: ChampionTestResult = {
          walletAddress: walletAddress.trim(),
          hasProfile: true,
          username: profile.username,
          displayName: profile.displayName,
          isChampion: profile.isArenaChampion || false,
          badges: profile.badges?.map((b) => b.badgeType) || [],
          keyPrice: profile.keyPrice,
          totalHolders: profile.totalHolders,
          arenaFollowers: profile.followerCount,
          twitterFollowers: profile.twitterFollowerCount,
        }

        console.log(`✅ Test result:`, testResult)
        setResult(testResult)
      } else {
        setResult({
          walletAddress: walletAddress.trim(),
          hasProfile: false,
          isChampion: false,
          badges: [],
        })
      }
    } catch (err) {
      console.error("❌ Champion test error:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const formatAvaxValue = (value: string | undefined): string => {
    if (!value) return "N/A"
    try {
      const avaxValue = Number(value) / 1e18
      if (avaxValue === 0) return "0 AVAX"
      if (avaxValue < 0.0001) return `${avaxValue.toFixed(8)} AVAX`
      if (avaxValue < 1) return `${avaxValue.toFixed(4)} AVAX`
      return `${avaxValue.toFixed(2)} AVAX`
    } catch {
      return "N/A"
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Arena Champion Debug Tool
        </CardTitle>
        <CardDescription>Test Arena Champion status detection for any wallet address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter wallet address (0x...)"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="flex-1"
          />
          <Button onClick={testChampionStatus} disabled={isLoading} className="min-w-[100px]">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Testing...
              </>
            ) : (
              "Test"
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Test Results</h3>
              {result.isChampion ? (
                <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                  <Crown className="h-3 w-3 mr-1" />
                  Arena Champion
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <User className="h-3 w-3 mr-1" />
                  Regular User
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Profile Info</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Has Profile:</strong> {result.hasProfile ? "✅ Yes" : "❌ No"}
                  </div>
                  <div>
                    <strong>Username:</strong> {result.username || "N/A"}
                  </div>
                  <div>
                    <strong>Display Name:</strong> {result.displayName || "N/A"}
                  </div>
                  <div>
                    <strong>Wallet:</strong> <code className="text-xs">{result.walletAddress}</code>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Arena Stats</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Key Price:</strong> {formatAvaxValue(result.keyPrice)}
                  </div>
                  <div>
                    <strong>Total Holders:</strong> {result.totalHolders || "N/A"}
                  </div>
                  <div>
                    <strong>Arena Followers:</strong> {result.arenaFollowers || "N/A"}
                  </div>
                  <div>
                    <strong>Twitter Followers:</strong> {result.twitterFollowers || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Badge Analysis</h4>
              <div className="text-sm">
                <div>
                  <strong>Total Badges:</strong> {result.badges.length}
                </div>
                <div>
                  <strong>Badge Types:</strong> {result.badges.length > 0 ? result.badges.join(", ") : "None"}
                </div>
                <div>
                  <strong>Has Champion Badge (Type 19):</strong> {result.badges.includes(19) ? "🏆 Yes" : "❌ No"}
                </div>
                <div>
                  <strong>Champion Status:</strong> {result.isChampion ? "🏆 CHAMPION" : "👤 Regular"}
                </div>
              </div>
            </div>

            {result.badges.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Badge Details</h4>
                <div className="flex flex-wrap gap-1">
                  {result.badges.map((badgeType) => (
                    <Badge
                      key={badgeType}
                      variant={badgeType === 19 ? "default" : "outline"}
                      className={badgeType === 19 ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                    >
                      {badgeType === 19 && <Crown className="h-3 w-3 mr-1" />}
                      Type {badgeType}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
