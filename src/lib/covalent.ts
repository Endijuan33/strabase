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

/**
 * Fetch all supported chains.
 */
export async function fetchChains(apiKey: string): Promise<CovalentChain[]> {
  const resp = await axios.get(`${COVALENT_BASE}/chains/`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
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
  const url = `${COVALENT_BASE}/${chain.chain_id}/address/${address}/balances_v2/?quote-currency=USD&nft=false&no-nft-fetch=true`
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    validateStatus: () => true,
  })
  if (resp.status >= 400) {
    // Return empty for this chain instead of throwing, so other chains still work
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
