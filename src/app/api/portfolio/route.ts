import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { fetchChains, fetchBalancesForChain } from "../../../lib/covalent"

/**
 * GET /api/portfolio?address=0x...
 * Aggregates portfolio balances across all 200+ EVM chains.
 * Detects verified and unverified tokens, native tokens, and all asset types.
 * Uses batching with concurrency control to avoid API throttling.
 */

const AddressQuery = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address. Provide a 0x-prefixed, 40-hex string."),
})

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 15 // Increased for multi-chain scanning
const ipHits = new Map<string, number[]>()

type ChainsCache = { chains: Awaited<ReturnType<typeof fetchChains>>; ts: number }
let chainsCache: ChainsCache | null = null
const CHAINS_TTL_MS = 6 * 60 * 60 * 1000

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
    return NextResponse.json(
      { error: "Rate limited. Maximum 15 requests per minute per IP." },
      { status: 429 }
    )
  }

  const parse = AddressQuery.safeParse({ address: url.searchParams.get("address") || "" })
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid address. Must be a valid 0x-prefixed EVM address." },
      { status: 400 }
    )
  }

  const address = parse.data.address.toLowerCase()

  try {
    const COVALENT_API_KEY = process.env.COVALENT_API_KEY
    if (!COVALENT_API_KEY || COVALENT_API_KEY.trim().length === 0) {
      return NextResponse.json(
        { error: "Server misconfigured: Missing COVALENT_API_KEY." },
        { status: 500 }
      )
    }

    // Fetch supported chains dynamically
    const chains = await getCachedChains(COVALENT_API_KEY)
    if (chains.length === 0) {
      return NextResponse.json(
        { error: "Unable to fetch supported chains. Please try again later." },
        { status: 503 }
      )
    }

    console.log(`[portfolio-api] scanning ${chains.length} chains for ${address}`)

    // Batch chain requests with concurrency control
    const concurrency = 5
    const results: Awaited<ReturnType<typeof fetchBalancesForChain>>[] = []
    let failedChains = 0

    for (let i = 0; i < chains.length; i += concurrency) {
      const batch = chains
        .slice(i, i + concurrency)
        .map((chain) => fetchBalancesForChain(COVALENT_API_KEY, chain, address))

      const settled = await Promise.allSettled(batch)
      for (const s of settled) {
        if (s.status === "fulfilled") {
          results.push(s.value)
        } else {
          failedChains++
        }
      }

      // Stagger requests to respect rate limits
      if (i + concurrency < chains.length) {
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    // Aggregate results and include all tokens (verified and unverified)
    const portfolioChains = results
      .map((r) => ({
        chainId: r.chainId,
        chainName: r.chainName,
        items: r.items,
        tokenCount: r.items.length,
        totalUsd: r.items.reduce((acc, it) => acc + (it.quote || 0), 0),
        verifiedTokens: r.items.filter((it) => it.verified).length,
        unverifiedTokens: r.items.filter((it) => !it.verified).length,
      }))
      .filter((c) => c.items.length > 0)

    const totalTokens = portfolioChains.reduce((acc, c) => acc + c.tokenCount, 0)
    const totalUsd = portfolioChains.reduce((acc, c) => acc + (c.totalUsd || 0), 0)

    console.log(
      `[portfolio-api] found ${totalTokens} tokens on ${portfolioChains.length} chains for ${address}`,
    )

    return NextResponse.json({
      address,
      chains: portfolioChains,
      summary: {
        totalTokens,
        totalUsd,
        chainsScanned: chains.length,
        chainsFailed: failedChains,
        chainsWithAssets: portfolioChains.length,
      },
      updatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error("[portfolio-api] critical error:", e)
    const message = e?.message || "Unexpected error while fetching portfolio. Please try again later."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
