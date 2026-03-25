import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { fetchChains, fetchBalancesForChain } from "../../../lib/covalent"

/**
 * GET /api/portfolio?address=0x...
 * Aggregates portfolio balances across all supported EVM chains using Covalent (GoldRush) API.
 * Uses batching with limited concurrency to avoid throttling.
 */

const AddressQuery = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address. Provide a 0x-prefixed, 40-hex string."),
})

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 12
const ipHits = new Map<string, number[]>()

type ChainsCache = { chains: Awaited<ReturnType<typeof fetchChains>>; ts: number }
let chainsCache: ChainsCache | null = null
const CHAINS_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const arr = ipHits.get(ip) || []
  const recent = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  ipHits.set(ip, recent)
  return recent.length > RATE_LIMIT_MAX
}

async function getCachedChains(apiKey: string) {
  const now = Date.now()
  if (chainsCache && now - chainsCache.ts < CHAINS_TTL_MS && (chainsCache.chains?.length || 0) > 0) {
    return chainsCache.chains
  }
  const fresh = await fetchChains(apiKey)
  chainsCache = { chains: fresh, ts: now }
  return fresh
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "unknown"
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again." }, { status: 429 })
  }
  const parse = AddressQuery.safeParse({ address: url.searchParams.get("address") || "" })
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten().fieldErrors }, { status: 400 })
  }
  const address = parse.data.address

  try {
    const COVALENT_API_KEY = process.env.COVALENT_API_KEY
    if (!COVALENT_API_KEY) {
      return NextResponse.json({ error: "Missing COVALENT_API_KEY. Set it in Vars or .env.local." }, { status: 500 })
    }

    const chains = await getCachedChains(COVALENT_API_KEY)

    const concurrency = 4
    const results: Awaited<ReturnType<typeof fetchBalancesForChain>>[] = []
    for (let i = 0; i < chains.length; i += concurrency) {
      const batch = chains
        .slice(i, i + concurrency)
        .map((chain) => fetchBalancesForChain(COVALENT_API_KEY, chain, address))
      const settled = await Promise.allSettled(batch)
      for (const s of settled) {
        if (s.status === "fulfilled") results.push(s.value)
      }
      await new Promise((r) => setTimeout(r, 250))
    }

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
