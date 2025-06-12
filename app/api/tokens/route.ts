import { NextResponse } from "next/server"
import { fetchTokens, fetchPendingTransactions } from "@/lib/blockchain"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "recent"

  try {
    if (type === "pending") {
      const pendingTokens = await fetchPendingTransactions()
      return NextResponse.json({ tokens: pendingTokens })
    } else {
      const tokens = await fetchTokens()
      return NextResponse.json({ tokens })
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to fetch token data" }, { status: 500 })
  }
}
