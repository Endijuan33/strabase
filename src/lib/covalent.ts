/**
 * Covalent (GoldRush) helpers.
 * - fetchChains: gets supported EVM chains dynamically
 * - fetchBalancesForChain: gets balances for an address on a specific chain
 */
import axios from "axios"

export interface CovalentChain {
  chain_id: number
  name: string
  label?: string
  is_testnet?: boolean
}

export interface PortfolioTokenItem {
  contractAddress: string | null
  logoUrl: string | null
  symbol: string
  balance: string // raw string balance, already human formatted
  decimals: number
  quote?: number | null // USD value
  nativeToken?: boolean
}

export interface ChainPortfolio {
  chainId: number
  chainName: string
  items: PortfolioTokenItem[]
}

const COVALENT_BASE = "https://api.covalenthq.com/v1"

function covalentClient(apiKey: string) {
  return axios.create({
    baseURL: COVALENT_BASE,
    timeout: 20000, // 20s timeout to avoid hung requests
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    // never throw for non-2xx; we handle status codes explicitly
    validateStatus: () => true,
  })
}

/**
 * Fetch all supported chains.
 */
export async function fetchChains(apiKey: string): Promise<CovalentChain[]> {
  const client = covalentClient(apiKey)
  const resp = await client.get(`/chains/`)
  if (resp.status >= 400) {
    return []
  }
  const data = resp.data
  const items: any[] = data?.data?.items || data?.items || []
  // Normalize to EVM chains (Covalent focuses on EVM; includes testnets)
  const chains: CovalentChain[] = items
    .filter((c) => typeof c.chain_id === "number" && !!c.name)
    .map((c) => ({
      chain_id: c.chain_id,
      name: c.name || c.label || `Chain ${c.chain_id}`,
      label: c.label,
      is_testnet: c.is_testnet,
    }))
  return chains
}

/**
 * Fetch balances for a single chain.
 * Uses balances_v2 endpoint and maps relevant fields.
 */
export async function fetchBalancesForChain(
  apiKey: string,
  chain: CovalentChain,
  address: string,
): Promise<ChainPortfolio> {
  const client = covalentClient(apiKey)
  const url = `/${chain.chain_id}/address/${address}/balances_v2/?quote-currency=USD&nft=false&no-nft-fetch=true`
  const resp = await client.get(url)
  if (resp.status >= 400) {
    return { chainId: chain.chain_id, chainName: chain.name, items: [] }
  }

  const items = resp.data?.data?.items || []
  const out: PortfolioTokenItem[] = items
    .filter((it: any) => (it?.type || "").toLowerCase() !== "nft")
    .map((it: any) => {
      const isNative = it.native_token === true || it.contract_address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      const decimals = typeof it.contract_decimals === "number" ? it.contract_decimals : 18
      // balance comes as "balance" raw string. Covalent also computes "quote" (USD).
      return {
        contractAddress: isNative ? null : it.contract_address || null,
        logoUrl: it.logo_url || null,
        symbol: it.contract_ticker_symbol || (isNative ? "NATIVE" : "TOKEN"),
        balance: formatUnitsSafe(it.balance, decimals),
        decimals,
        quote: typeof it.quote === "number" ? it.quote : null,
        nativeToken: !!isNative,
      }
    })
    // Remove zero balances
    .filter((t: PortfolioTokenItem) => {
      const n = Number(t.balance)
      return !isNaN(n) && n > 0
    })

  return { chainId: chain.chain_id, chainName: chain.name, items: out }
}

/**
 * Formats a string/BN balance into human readable using decimals.
 * Safe implementation that avoids throwing on bad inputs.
 */
function formatUnitsSafe(value: any, decimals: number): string {
  try {
    if (value == null) return "0"
    const s = String(value)
    if (!/^\d+$/.test(s)) return "0"
    const d = Math.max(0, Math.floor(decimals || 0))
    if (d === 0) return s
    const padded = s.padStart(d + 1, "0")
    const int = padded.slice(0, -d)
    const frac = padded.slice(-d).replace(/0+$/, "")
    return frac ? `${int}.${frac}` : int
  } catch {
    return "0"
  }
}

// Ensure named exports are available explicitly for bundlers/importers
