"use client"
import { Card } from "@/components/ui/card"
import { TokenCard } from "@/src/components/TokenCard"

type Props = {
  data: {
    address: string
    chains: Array<{
      chainId: number
      chainName: string
      items: Array<{
        contractAddress: string | null
        logoUrl: string | null
        symbol: string
        balance: string
        decimals: number
        quote?: number | null
        nativeToken?: boolean
      }>
      totalUsd?: number
    }>
    updatedAt: string
  }
}

/**
 * Renders portfolio grouped by chain in a responsive grid.
 */
export function PortfolioGrid({ data }: Props) {
  return (
    <div className="grid gap-6 md:gap-8">
      {data.chains.map((chain) => (
        <Card key={chain.chainId} className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-medium">{chain.chainName}</h2>
            <div className="text-sm text-muted-foreground">
              {typeof chain.totalUsd === "number" ? `$${chain.totalUsd.toFixed(2)} total` : "—"}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {chain.items.map((t, idx) => (
              <TokenCard key={`${chain.chainId}-${t.contractAddress || "native"}-${idx}`} token={t} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
