"use client"

import React from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Wallet, RefreshCcw } from "lucide-react"
import { useTheme } from "next-themes"
import { PortfolioGrid } from "../components/PortfolioGrid"
import { Loader } from "../components/Loader"
import { ErrorMessage } from "../components/ErrorMessage"
import { AddressInput } from "../components/AddressInput"
import { getConnectedAddress } from "../lib/wallet"
import { useSearchParams } from "next/navigation"
import { isAddress } from "ethers"

type PortfolioResponse = {
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

const fetcher = async (url: string): Promise<PortfolioResponse> => {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  })
  const contentType = res.headers.get("content-type") || ""

  if (!res.ok) {
    // Try to read JSON error if available, otherwise show first part of text/html
    if (contentType.includes("application/json")) {
      try {
        const json = await res.json()
        const msg = typeof json?.error === "string" ? json.error : JSON.stringify(json)
        throw new Error(msg || `Request failed: ${res.status}`)
      } catch (e: any) {
        throw new Error(e?.message || `Request failed: ${res.status}`)
      }
    } else {
      try {
        const text = await res.text()
        throw new Error(`Request failed ${res.status}. Body: ${text.slice(0, 300)}`)
      } catch {
        throw new Error(`Request failed: ${res.status}`)
      }
    }
  }

  if (!contentType.includes("application/json")) {
    // Avoid JSON.parse on HTML
    const text = await res.text()
    throw new Error(`Unexpected non-JSON response from API. First 200 chars: ${text.slice(0, 200)}`)
  }

  return (await res.json()) as PortfolioResponse
}

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [address, setAddress] = React.useState<string>("")
  const searchParams = useSearchParams()

  React.useEffect(() => {
    let mounted = true
    getConnectedAddress().then((addr) => {
      if (mounted && addr) setAddress(addr)
    })
    const eth: any = (globalThis as any).ethereum
    if (eth?.on) {
      const onAccountsChanged = (accs: string[]) => setAddress(accs?.[0] || "")
      eth.on("accountsChanged", onAccountsChanged)
      return () => {
        try {
          eth.removeListener("accountsChanged", onAccountsChanged)
        } catch {}
      }
    }
    return () => {
      mounted = false
    }
  }, [])

  React.useEffect(() => {
    const param = searchParams.get("address") || ""
    if (param && isAddress(param) && param.toLowerCase() !== address.toLowerCase()) {
      setAddress(param)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const { data, error, isLoading, mutate } = useSWR<PortfolioResponse>(
    address ? `/api/portfolio?address=${address}` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 },
  )

  const onConnectClick = async () => {
    try {
      const eth: any = (globalThis as any).ethereum
      if (!eth) {
        alert("No EVM wallet detected. Please install a wallet like MetaMask.")
        return
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" })
      setAddress(accounts?.[0] || "")
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Failed to connect wallet")
    }
  }

  return (
    <main className="min-h-dvh container mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <img src="/placeholder-logo.svg" alt="App Logo" className="size-8" />
          <h1 className="text-xl md:text-2xl font-semibold text-pretty">strabase-portofolio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="gap-2"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="hidden md:inline">Toggle</span>
          </Button>
          <Button onClick={() => mutate()} variant="outline" className="gap-2">
            <RefreshCcw className="size-4" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          {!address && <AddressInput />}
          <Button onClick={onConnectClick} className="gap-2">
            <Wallet className="size-4" />
            <span className="hidden md:inline">{address ? "Connected" : "Connect (Injected)"}</span>
          </Button>
        </div>
      </div>

      <Card className="p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm md:text-base">
            <div className="font-medium">Connected Address</div>
            <div className="text-muted-foreground break-all">{address || "Not connected"}</div>
          </div>
          <div className="text-sm text-muted-foreground">Data from Covalent GoldRush API across EVM chains</div>
        </div>
      </Card>

      {!address && (
        <ErrorMessage
          title="No wallet connected"
          description="Connect a wallet or paste an address to see a multi-chain portfolio."
        />
      )}

      {address && isLoading && <Loader label="Fetching portfolio..." />}

      {address && error && (
        <ErrorMessage
          title="Failed to load portfolio"
          description={error?.message ?? "An unknown error occurred while fetching your portfolio."}
        />
      )}

      {address && data && (
        <>
          {data.chains.length === 0 ? (
            <ErrorMessage title="No assets found" description="We did not find any balances on supported chains." />
          ) : (
            <PortfolioGrid data={data} />
          )}
        </>
      )}

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Built with Reown AppKit + Covalent | Dark mode supported
      </footer>
    </main>
  )
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "appkit-connect-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: "sm" | "md"
        label?: string
        loadingLabel?: string
      }
    }
  }
}
