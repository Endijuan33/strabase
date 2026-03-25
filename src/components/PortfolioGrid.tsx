"use client"
import { Card } from "@/components/ui/card"
import { TokenCard } from "../components/TokenCard"
import { AlertCircle, CheckCircle2 } from "lucide-react"

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
        verified?: boolean
        blockchainName?: string
        protocol?: string | null
      }>
      totalUsd?: number
      tokenCount?: number
      verifiedTokens?: number
      unverifiedTokens?: number
    }>
    summary?: {
      totalTokens: number
      totalUsd: number
      chainsScanned: number
      chainsFailed: number
      chainsWithAssets: number
    }
    updatedAt: string
  }
}

/**
 * Renders portfolio grouped by chain with verification status badges.
 * Displays comprehensive asset detection across all scanned chains.
 */
export function PortfolioGrid({ data }: Props) {
  const totalUsd = data.summary?.totalUsd ?? data.chains.reduce((acc, c) => acc + (c.totalUsd ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      {data.summary && (
        <Card className="p-4 md:p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Total Assets</div>
              <div className="text-2xl md:text-3xl font-bold">{data.summary.totalTokens}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Portfolio Value</div>
              <div className="text-2xl md:text-3xl font-bold">${totalUsd.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Chains Scanned</div>
              <div className="text-2xl md:text-3xl font-bold">{data.summary.chainsScanned}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">With Assets</div>
              <div className="text-2xl md:text-3xl font-bold">{data.summary.chainsWithAssets}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Last Updated</div>
              <div className="text-sm font-mono">
                {new Date(data.updatedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Chains Grid */}
      <div className="grid gap-6 md:gap-8">
        {data.chains.map((chain) => {
          const unverifiedTokens = chain.items.filter((t) => t.verified === false).length
          const verifiedTokens = chain.items.filter((t) => t.verified !== false).length

          return (
            <Card key={chain.chainId} className="p-4 md:p-6">
              {/* Chain Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-4 border-b">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold">{chain.chainName}</h2>
                  <div className="text-sm text-muted-foreground mt-1">
                    {chain.items.length} token{chain.items.length !== 1 ? "s" : ""}
                    {unverifiedTokens > 0 && ` (${unverifiedTokens} unverified)`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="text-xl md:text-2xl font-bold">
                    ${(chain.totalUsd || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Verification Stats */}
              {(verifiedTokens > 0 || unverifiedTokens > 0) && (
                <div className="flex gap-4 mb-4 text-xs">
                  {verifiedTokens > 0 && (
                    <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="size-4" />
                      <span>{verifiedTokens} verified</span>
                    </div>
                  )}
                  {unverifiedTokens > 0 && (
                    <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                      <AlertCircle className="size-4" />
                      <span>{unverifiedTokens} unverified</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tokens Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {chain.items.map((t, idx) => (
                  <TokenCard
                    key={`${chain.chainId}-${t.contractAddress || "native"}-${idx}`}
                    token={t}
                  />
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
