"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  fetchArenaUserProfile,
  clearArenaProfileCache,
  getArenaProfileCacheStatus,
  testStarsArenaEndpoints,
  type ArenaUserProfile,
} from "@/lib/arena-socials"

export function ArenaDebug() {
  const [testAddress, setTestAddress] = useState("")
  const [testUserId, setTestUserId] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [testResult, setTestResult] = useState<ArenaUserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [cacheStatus, setCacheStatus] = useState({ size: 0, entries: [] as string[] })

  const handleTest = async () => {
    if (!testAddress) return

    setLoading(true)
    try {
      console.log(`Testing address: ${testAddress}`)

      // Temporarily set the API key in the environment if provided
      if (apiKey) {
        process.env.ARENA_API_KEY = apiKey
        process.env.ARENA_BEARER = apiKey
      }

      const profile = await fetchArenaUserProfile(testAddress)
      setTestResult(profile)

      // Update cache status
      setCacheStatus(getArenaProfileCacheStatus())

      // Clear the temporary API key
      if (apiKey) {
        delete process.env.ARENA_API_KEY
        delete process.env.ARENA_BEARER
      }
    } catch (error) {
      console.error("Test failed:", error)
      setTestResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTestEndpoints = async () => {
    if (!testUserId) return

    setLoading(true)
    try {
      await testStarsArenaEndpoints(testUserId)
    } catch (error) {
      console.error("Endpoint test failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = () => {
    clearArenaProfileCache()
    setCacheStatus(getArenaProfileCacheStatus())
    setTestResult(null)
  }

  const updateCacheStatus = () => {
    setCacheStatus(getArenaProfileCacheStatus())
  }

  // Test with known addresses
  const testKnownAddresses = [
    "0x1b14ae52d886bd160bb51215524112232f6c9032", // DavyJones55
    "0x1234567890123456789012345678901234567890", // Test address
  ]

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Arena API Debug Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter wallet address to test..."
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleTest} disabled={loading || !testAddress}>
            {loading ? "Testing..." : "Test"}
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Optional API Key (Bearer Token)..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1"
            type="password"
          />
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Enter handle to test StarsArena flow (e.g., DextrendAI)..."
            value={testUserId}
            onChange={(e) => setTestUserId(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleTestEndpoints} disabled={loading || !testUserId}>
            Test Flow
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={updateCacheStatus}>
            Check Cache
          </Button>
          <Button variant="outline" onClick={handleClearCache}>
            Clear Cache
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {testKnownAddresses.map((address) => (
            <Button
              key={address}
              variant="outline"
              size="sm"
              onClick={() => {
                setTestAddress(address)
              }}
            >
              Test {address.substring(0, 10)}...
            </Button>
          ))}
        </div>

        <div className="text-sm">
          <strong>Cache Status:</strong> {cacheStatus.size} entries
          {cacheStatus.entries.length > 0 && (
            <div className="mt-1">
              {cacheStatus.entries.slice(0, 3).map((entry) => (
                <Badge key={entry} variant="outline" className="mr-1 text-xs">
                  {entry.substring(0, 8)}...
                </Badge>
              ))}
              {cacheStatus.entries.length > 3 && <span>+{cacheStatus.entries.length - 3} more</span>}
            </div>
          )}
        </div>

        <div className="text-xs bg-blue-50 p-2 rounded">
          <strong>Environment Variables:</strong>
          <div>ARENA_API_KEY: {process.env.ARENA_API_KEY ? "✅ Set" : "❌ Not set"}</div>
          <div>ARENA_BEARER: {process.env.ARENA_BEARER ? "✅ Set" : "❌ Not set"}</div>
        </div>

        {testResult && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="py-2">
              <CardTitle className="text-sm text-green-800">✅ Profile Found</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <pre className="text-xs overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        {testResult === null && testAddress && !loading && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="py-2">
              <div className="text-sm text-red-800">❌ No profile found for {testAddress}</div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
