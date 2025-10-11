"use client"
import { Card } from "@/components/ui/card"

export type TokenCardProps = {
  token: {
    contractAddress: string | null
    logoUrl: string | null
    symbol: string
    balance: string
    decimals: number
    quote?: number | null
    nativeToken?: boolean
  }
}

/**
 * Displays a token with logo, symbol and USD value if available.
 */
export function TokenCard({ token }: TokenCardProps) {
  return (
    <Card className="p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 bg-card">
      <div className="flex items-center gap-3">
        <img
          src={token.logoUrl || "/placeholder.svg?height=40&width=40&query=token%20logo%20placeholder"}
          alt={`${token.symbol} logo`}
          className="size-10 rounded-md object-contain"
        />
        <div className="min-w-0">
          <div className="font-medium truncate">{token.symbol}</div>
          <div className="text-xs text-muted-foreground">
            {token.nativeToken ? "Native" : token.contractAddress?.slice(0, 6) + "…" + token.contractAddress?.slice(-4)}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-semibold">{token.balance}</div>
          <div className="text-xs text-muted-foreground">
            {typeof token.quote === "number" ? `$${token.quote.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>
    </Card>
  )
}
