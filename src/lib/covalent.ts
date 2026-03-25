/**
 * Enhanced Covalent (GoldRush) API helpers for robust portfolio detection.
 * - Detects all assets including unverified tokens
 * - Supports native tokens and ERC20 tokens across 200+ EVM chains
 * - Implements fallback strategies for API edge cases
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
  balance: string
  decimals: number
  quote?: number | null
  nativeToken?: boolean
  verified?: boolean
  blockchainName?: string
  protocol?: string
}

export interface ChainPortfolio {
  chainId: number
  chainName: string
  items: PortfolioTokenItem[]
}

const COVALENT_BASE = "https://api.covalenthq.com/v1"
const FALLBACK_DECIMALS = 18

function covalentClient(apiKey: string) {
  return axios.create({
    baseURL: COVALENT_BASE,
    timeout: 25000, // Extended timeout for slower connections
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    validateStatus: () => true, // Handle all status codes explicitly
  })
}

/**
 * Dynamically fetch all supported EVM chains from Covalent.
 * Filters out non-EVM chains and testnets if needed.
 */
export async function fetchChains(apiKey: string): Promise<CovalentChain[]> {
  const client = covalentClient(apiKey)
  try {
    const resp = await client.get(`/chains/`)
    if (resp.status >= 400) {
      console.warn(`[fetchChains] API returned status ${resp.status}`)
      return []
    }

    const data = resp.data
    const items: any[] = data?.data?.items || data?.items || []

    const chains: CovalentChain[] = items
      .filter((c) => typeof c.chain_id === "number" && !!c.name && !c.is_testnet)
      .map((c) => ({
        chain_id: c.chain_id,
        name: c.name || c.label || `Chain ${c.chain_id}`,
        label: c.label,
        is_testnet: c.is_testnet,
      }))

    return chains.length > 0 ? chains : []
  } catch (err) {
    console.error("[fetchChains] unexpected error:", err)
    return []
  }
}

/**
 * Fetch all token balances for an address on a specific chain.
 * Includes native token, verified ERC20s, and unverified tokens.
 * Filters zero balances and handles missing metadata gracefully.
 */
export async function fetchBalancesForChain(
  apiKey: string,
  chain: CovalentChain,
  address: string,
): Promise<ChainPortfolio> {
  const client = covalentClient(apiKey)
  try {
    // Request balances with USD quotes and include spam tokens (some are legitimate)
    const url = `/${chain.chain_id}/address/${address}/balances_v2/?quote-currency=USD&nft=false&no-nft-fetch=true&with-spam-appraisal=true`
    const resp = await client.get(url)

    if (resp.status >= 400) {
      console.warn(`[fetchBalancesForChain] chain ${chain.chain_id} returned status ${resp.status}`)
      return { chainId: chain.chain_id, chainName: chain.name, items: [] }
    }

    const items = resp.data?.data?.items || []
    if (!Array.isArray(items)) {
      console.warn(`[fetchBalancesForChain] items is not an array for chain ${chain.chain_id}`)
      return { chainId: chain.chain_id, chainName: chain.name, items: [] }
    }

    const out: PortfolioTokenItem[] = items
      .filter((it: any) => {
        // Exclude NFTs explicitly
        const type = (it?.type || "").toLowerCase()
        return type !== "nft" && type !== "dust" && it?.contract_address
      })
      .map((it: any) => {
        const isNative =
          it.native_token === true ||
          it.contract_address?.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

        const decimals =
          typeof it.contract_decimals === "number" && it.contract_decimals >= 0
            ? it.contract_decimals
            : FALLBACK_DECIMALS

        const balance = formatUnitsSafe(it.balance, decimals)
        const balanceNum = parseFloat(balance)

        // Include tokens even if verification status is unknown or unverified
        return {
          contractAddress: isNative ? null : sanitizeAddress(it.contract_address),
          logoUrl: it.logo_url || null,
          symbol: (it.contract_ticker_symbol || it.contract_name || "TOKEN").substring(0, 20).toUpperCase(),
          balance,
          decimals,
          quote: typeof it.quote === "number" ? it.quote : null,
          nativeToken: !!isNative,
          verified: it.is_spam === false, // Mark verified if not marked as spam
          blockchainName: chain.name,
          protocol: it.protocol_name || null,
        }
      })
      // Filter out zero or negative balances only
      .filter((t: PortfolioTokenItem) => {
        const n = parseFloat(t.balance)
        return !isNaN(n) && n > 0
      })

    return {
      chainId: chain.chain_id,
      chainName: chain.name,
      items: out,
    }
  } catch (err) {
    console.error(`[fetchBalancesForChain] error on chain ${chain.chain_id}:`, err)
    return { chainId: chain.chain_id, chainName: chain.name, items: [] }
  }
}

/**
 * Safely format raw token balance using decimals.
 * Handles edge cases like missing or invalid decimals.
 */
function formatUnitsSafe(value: any, decimals: number): string {
  try {
    if (value == null || value === "" || value === "0") return "0"
    const s = String(value).trim()
    if (!/^\d+$/.test(s)) return "0"

    const d = Math.max(0, Math.floor(Math.abs(decimals) || 0))
    if (d === 0) return s
    if (s.length <= d) return `0.${"0".repeat(d - s.length)}${s}`

    const int = s.slice(0, -d)
    const frac = s.slice(-d).replace(/0+$/, "")
    return frac ? `${int || "0"}.${frac}` : int || "0"
  } catch (err) {
    console.warn("[formatUnitsSafe] formatting error:", err)
    return "0"
  }
}

/**
 * Sanitize contract address to valid EVM format.
 */
function sanitizeAddress(addr: any): string | null {
  if (!addr) return null
  const s = String(addr).toLowerCase().trim()
  return /^0x[a-f0-9]{40}$/.test(s) ? s : null
}

// Named exports for compatibility
export { fetchChains, fetchBalancesForChain }
