import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ArenaContractInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Arena Launch Contract</CardTitle>
        <CardDescription>
          Contract that enables token creation, liquidity provision, and token sales on Avalanche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Contract Address:</span>
            <code className="bg-muted px-2 py-1 rounded text-sm">0x8315f1eb449Dd4B779495C3A0b05e5d194446c6e</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Network:</span>
            <span>Avalanche C-Chain</span>
          </div>
          <div className="flex items-center justify-end mt-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://snowtrace.io/address/0x8315f1eb449Dd4B779495C3A0b05e5d194446c6e"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                View on Snowtrace <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
