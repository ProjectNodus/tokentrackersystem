"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TokenDetailsProps {
  address: string
  isOpen: boolean
  onClose: () => void
}

interface TokenDetail {
  name: string
  symbol: string
  totalSupply: string
  creator: string
  timestamp: number
  holders: number
  transactions: number
}

export function TokenDetails({ address, isOpen, onClose }: TokenDetailsProps) {
  const [token, setToken] = useState<TokenDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && address) {
      // In a real implementation, fetch detailed token data from an API
      setLoading(true)

      // Simulate API call with timeout
      setTimeout(() => {
        setToken({
          name: "Example Token",
          symbol: "EXT",
          totalSupply: "1000000",
          creator: "0x1234...5678",
          timestamp: Date.now() - 3600000, // 1 hour ago
          holders: 12,
          transactions: 45,
        })
        setLoading(false)
      }, 1000)
    }
  }, [isOpen, address])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{loading ? <Skeleton className="h-6 w-40" /> : token?.name}</DialogTitle>
          <DialogDescription>{loading ? <Skeleton className="h-4 w-20" /> : token?.symbol}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Supply:</span>
              <span>{Number(token?.totalSupply).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creator:</span>
              <span className="font-mono">{token?.creator}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Holders:</span>
              <span>{token?.holders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transactions:</span>
              <span>{token?.transactions}</span>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://snowtrace.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  View on Snowtrace <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
