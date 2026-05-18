"use client"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export type TokenCardProps = {
  token: {
    contractAddress: string | null
    logoUrl: string | null
    symbol: string
    balance: string
    decimals: number
    quote?: number | null
    nativeToken?: boolean
    verified?: boolean
    blockchainName?: string
    protocol?: string | null
  }
}

/**
 * Displays a token with logo, symbol, USD value, and verification status.
 * Unverified tokens are marked with a warning icon and styling.
 */
export function TokenCard({ token }: TokenCardProps) {
  const isUnverified = token.verified === false
  const balanceNum = parseFloat(token.balance)

  return (
    <Card
      className={`p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        isUnverified
          ? "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
          : "bg-card"
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Token Header */}
        <div className="flex items-center gap-3">
          <img
            src={token.logoUrl || "/placeholder.svg?height=40&width=40&query=token%20logo%20placeholder"}
            alt={`${token.symbol} logo`}
            className="size-10 rounded-md object-contain"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium truncate text-sm md:text-base">{token.symbol}</div>
              {isUnverified && (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 rounded-sm text-xs font-medium text-yellow-800 dark:text-yellow-200"
                  title="This token is not officially verified"
                >
                  <AlertCircle className="size-3" />
                  <span className="hidden sm:inline">Unverified</span>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {token.nativeToken ? "Native Token" : token.contractAddress?.slice(0, 6) + "…" + token.contractAddress?.slice(-4)}
            </div>
          </div>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className="font-semibold text-sm md:text-base">
              {balanceNum > 0.0001 ? token.balance : `< 0.0001`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">USD Value</div>
            <div className="font-semibold text-sm md:text-base">
              {typeof token.quote === "number" && token.quote >= 0.01 ? `$${token.quote.toFixed(2)}` : "< $0.01"}
            </div>
          </div>
        </div>

        {/* Metadata */}
        {(token.blockchainName || token.protocol) && (
          <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
            {token.blockchainName && <div>Chain: {token.blockchainName}</div>}
            {token.protocol && <div>Protocol: {token.protocol}</div>}
          </div>
        )}
      </div>
    </Card>
  )
}
