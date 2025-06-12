"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ExternalLink,
  Twitter,
  Globe,
  MessageCircle,
  Verified,
  Users,
  Coins,
  DollarSign,
  TrendingUp,
  Award,
  Star,
  XCircle,
  HelpCircle,
} from "lucide-react"
import type { CreatorProfile as CreatorProfileType } from "@/lib/blockchain"
import { formatAvaxValue } from "@/lib/arena-socials"
import { Skeleton } from "@/components/ui/skeleton"
import { getCreator, type Creator } from "@/lib/database-simple"

interface CreatorProfileProps {
  creatorProfile: CreatorProfileType
  compact?: boolean
}

export function CreatorProfile({ creatorProfile, compact = false }: CreatorProfileProps) {
  const [imageError, setImageError] = useState(false)
  const [creatorData, setCreatorData] = useState<Creator | null>(null)
  const [loadingCreator, setLoadingCreator] = useState(false)

  const { address, arenaProfile, isLoading } = creatorProfile

  // Debug logging to see what data we have
  useEffect(() => {
    console.log("=== CREATOR PROFILE DEBUG ===")
    console.log("Address:", address)
    console.log("Arena Profile:", arenaProfile)
    console.log("Is Loading:", isLoading)

    if (arenaProfile) {
      console.log("Arena Profile Data:", {
        username: arenaProfile.username,
        displayName: arenaProfile.displayName,
        followerCount: arenaProfile.followerCount,
        keyPrice: arenaProfile.keyPrice,
        verified: arenaProfile.verified,
        badges: arenaProfile.badges,
        isArenaChampion: arenaProfile.isArenaChampion,
        fullProfile: arenaProfile,
      })
    } else {
      console.log("No Arena Profile found")
    }
    console.log("=== END DEBUG ===")
  }, [arenaProfile, address, isLoading])

  // Fetch creator data from database
  useEffect(() => {
    async function fetchCreatorData() {
      if (!address) return

      setLoadingCreator(true)
      try {
        const creator = await getCreator(address)
        setCreatorData(creator)
      } catch (error) {
        console.error("Error fetching creator data:", error)
      } finally {
        setLoadingCreator(false)
      }
    }

    fetchCreatorData()
  }, [address])

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Function to render Arena Champion status badge - ALWAYS show something
  const renderChampionStatus = (arenaProfile: any, size: "small" | "large" = "large") => {
    console.log("renderChampionStatus called with:", { arenaProfile, size })

    // If we have arena profile data
    if (arenaProfile) {
      // Check explicitly for badges array and badgeType 19
      let isChampion = false

      if (arenaProfile.badges && Array.isArray(arenaProfile.badges)) {
        console.log("Checking badges for Arena Champion status:", arenaProfile.badges)
        isChampion = arenaProfile.badges.some((badge: any) => badge.badgeType === 19)
        console.log("Found Arena Champion badge (badgeType 19):", isChampion)
      } else {
        console.log("No badges array found in arena profile")
      }

      if (isChampion) {
        return size === "small" ? (
          <Award className="h-3 w-3 text-yellow-500 flex-shrink-0" title="Arena Champion" />
        ) : (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
            <Award className="h-3 w-3" />
            Arena Champion
          </Badge>
        )
      } else {
        return size === "small" ? (
          <XCircle className="h-3 w-3 text-gray-400 flex-shrink-0" title="Not an Arena Champion" />
        ) : (
          <Badge variant="outline" className="text-gray-500 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Not Champion
          </Badge>
        )
      }
    } else {
      // No arena profile at all
      return size === "small" ? (
        <HelpCircle className="h-3 w-3 text-gray-300 flex-shrink-0" title="No Arena profile" />
      ) : (
        <Badge variant="outline" className="text-gray-400 flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />
          No Arena Profile
        </Badge>
      )
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!arenaProfile) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gray-300 text-gray-600">
                {getInitials(formatAddress(address))}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <div className="font-mono text-sm">{formatAddress(address)}</div>
                {renderChampionStatus(null, "small")}
              </div>
              <div className="text-xs text-muted-foreground">No Arena profile found</div>
              {/* Show database stats even without Arena profile */}
              {creatorData && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {creatorData.contracts_created} tokens
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={!imageError ? arenaProfile.avatar : undefined}
                alt={arenaProfile.displayName || arenaProfile.username}
                onError={() => setImageError(true)}
              />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(arenaProfile.displayName || arenaProfile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm truncate">
                  {arenaProfile.displayName || arenaProfile.username || "Unknown"}
                </span>
                {arenaProfile.verified && <Verified className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                {renderChampionStatus(arenaProfile, "small")}
              </div>
              <div className="text-xs text-muted-foreground">@{arenaProfile.username || formatAddress(address)}</div>

              {/* Database stats */}
              <div className="flex items-center gap-1 mt-1">
                {creatorData && (
                  <Badge variant="outline" className="text-xs">
                    {creatorData.contracts_created} tokens
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  {arenaProfile.followerCount !== undefined && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Users className="h-2 w-2" />
                      {arenaProfile.followerCount.toLocaleString()} Arena
                    </Badge>
                  )}
                  {arenaProfile.twitterFollowerCount !== undefined && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Twitter className="h-2 w-2" />
                      {arenaProfile.twitterFollowerCount.toLocaleString()} X
                    </Badge>
                  )}
                </div>
                {creatorData?.contract_tickers.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Latest: {creatorData.contract_tickers[creatorData.contract_tickers.length - 1]?.symbol}
                  </Badge>
                )}
              </div>

              {arenaProfile.keyPrice && Number(arenaProfile.keyPrice) > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  Ticket: {formatAvaxValue(arenaProfile.keyPrice)} AVAX
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {arenaProfile.twitter && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                  <a
                    href={`https://twitter.com/${arenaProfile.twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="h-3 w-3" />
                  </a>
                </Button>
              )}
              {arenaProfile.website && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                  <a href={arenaProfile.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                <a
                  href={`https://arena.social/${arenaProfile.username || address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Arena Profile"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={!imageError ? arenaProfile.avatar : undefined}
              alt={arenaProfile.displayName || arenaProfile.username}
              onError={() => setImageError(true)}
            />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
              {getInitials(arenaProfile.displayName || arenaProfile.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">
                {arenaProfile.displayName || arenaProfile.username || "Unknown User"}
              </h3>
              {arenaProfile.verified && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 flex items-center gap-1">
                  <Verified className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {renderChampionStatus(arenaProfile, "large")}
            </div>

            <div className="text-sm text-muted-foreground mb-2">@{arenaProfile.username || formatAddress(address)}</div>

            {arenaProfile.bio && <p className="text-sm text-gray-700 mb-3 line-clamp-2">{arenaProfile.bio}</p>}

            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mb-3">
              {/* Database stats */}
              {creatorData && (
                <>
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {creatorData.contracts_created} tokens created
                  </div>
                  {creatorData.contract_tickers.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        Latest: {creatorData.contract_tickers[creatorData.contract_tickers.length - 1]?.symbol}
                      </Badge>
                    </div>
                  )}
                </>
              )}

              {/* Arena stats - make followerCount more prominent */}
              {arenaProfile.followerCount !== undefined && (
                <div className="flex items-center gap-1 text-blue-600 font-medium">
                  <Users className="h-3 w-3" />
                  {arenaProfile.followerCount.toLocaleString()} Arena followers
                </div>
              )}
              {arenaProfile.twitterFollowerCount !== undefined && (
                <div className="flex items-center gap-1 text-blue-600 font-medium">
                  <Twitter className="h-3 w-3" />
                  {arenaProfile.twitterFollowerCount.toLocaleString()} X followers
                </div>
              )}
              {arenaProfile.keyPrice && Number(arenaProfile.keyPrice) > 0 && (
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <DollarSign className="h-3 w-3" />
                  Ticket: {formatAvaxValue(arenaProfile.keyPrice)} AVAX
                </div>
              )}
              {arenaProfile.totalHolders && Number(arenaProfile.totalHolders) > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {arenaProfile.totalHolders} holders
                </div>
              )}
              {arenaProfile.volume && Number(arenaProfile.volume) > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Volume: {formatAvaxValue(arenaProfile.volume)} AVAX
                </div>
              )}
            </div>

            {/* Show badges if available */}
            {arenaProfile.badges && arenaProfile.badges.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-muted-foreground block mb-1">Badges:</span>
                <div className="flex flex-wrap gap-1">
                  {arenaProfile.badges.map((badge, i) => (
                    <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      Badge #{badge.badgeType}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Show recent tickers if available */}
            {creatorData && creatorData.contract_tickers.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-muted-foreground block mb-1">Recent Tickers:</span>
                <div className="flex flex-wrap gap-1">
                  {creatorData.contract_tickers.slice(-5).map((ticker, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {ticker.symbol}
                    </Badge>
                  ))}
                  {creatorData.contract_tickers.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{creatorData.contract_tickers.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {arenaProfile.twitter && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://twitter.com/${arenaProfile.twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <Twitter className="h-3 w-3" />
                    Twitter
                  </a>
                </Button>
              )}
              {arenaProfile.telegram && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://t.me/${arenaProfile.telegram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Telegram
                  </a>
                </Button>
              )}
              {arenaProfile.website && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={arenaProfile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    Website
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://arena.social/${arenaProfile.username || address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Arena Profile
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
