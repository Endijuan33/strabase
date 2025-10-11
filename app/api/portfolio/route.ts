import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerEnv } from "@/lib/env"
import { fetchChains, fetchBalancesForChain } from "@/lib/covalent"

/**
 * GET /api/portfolio?address=0x...
 * Aggregates portfolio balances across all supported EVM chains using Covalent (GoldRush) API.
 * Uses batching with limited concurrency to avoid throttling.
 */

const AddressQuery = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address. Provide a 0x-prefixed, 40-hex string."),
})

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const parse = AddressQuery.safeParse({ address: url.searchParams.get("address") || "" })
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten().fieldErrors }, { status: 400 })
  }
  const address = parse.data.address

  const { COVALENT_API_KEY } = getServerEnv()

  try {
    // 1) Fetch supported chains dynamically
    const chains = await fetchChains(COVALENT_API_KEY)

    // 2) Process in batches to avoid rate limiting
    const concurrency = 4
    const results: Awaited<ReturnType<typeof fetchBalancesForChain>>[] = []
    for (let i = 0; i < chains.length; i += concurrency) {
      const batch = chains
        .slice(i, i + concurrency)
        .map((chain) => fetchBalancesForChain(COVALENT_API_KEY, chain, address))
      const settled = await Promise.allSettled(batch)
      for (const s of settled) {
        if (s.status === "fulfilled") results.push(s.value)
        // Ignore rejected chains to avoid failing the whole request
      }
      // small delay between batches
      await new Promise((r) => setTimeout(r, 250))
    }

    // 3) Filter out empty results and compute per-chain totals
    const nonEmpty = results
      .map((r) => ({
        chainId: r.chainId,
        chainName: r.chainName,
        items: r.items,
        totalUsd: r.items.reduce((acc, it) => acc + (it.quote || 0), 0),
      }))
      .filter((c) => c.items.length > 0)

    return NextResponse.json({
      address,
      chains: nonEmpty,
      updatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error("[portfolio-api] error:", e?.response?.data || e)
    const status = e?.response?.status || 500
    const message =
      e?.response?.data?.error || e?.message || "Unexpected error while fetching portfolio. Please try again later."
    return NextResponse.json({ error: message }, { status })
  }
}
