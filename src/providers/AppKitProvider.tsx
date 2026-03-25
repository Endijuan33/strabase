"use client"

/**
 * Initializes Reown AppKit with EthersAdapter.
 * We call createAppKit on the client in a guarded useEffect to avoid SSR issues.
 */
import React from "react"
import { getClientEnv } from "@/src/lib/env"

let initialized = false

export function AppKitProvider() {
  React.useEffect(() => {
    if (initialized) return
    let cancelled = false

    async function init() {
      try {
        const { NEXT_PUBLIC_PROJECT_ID, NEXT_PUBLIC_METADATA_URL } = getClientEnv()

        // Lazily import AppKit and EthersAdapter client-side only
        const [{ createAppKit }, { EthersAdapter }] = await Promise.all([
          import("@reown/appkit"),
          import("@reown/appkit-adapter-ethers"),
        ])

        if (cancelled) return

        createAppKit({
          adapters: [new EthersAdapter()],
          projectId: NEXT_PUBLIC_PROJECT_ID,
          metadata: {
            name: "strabase-portofolio",
            description: "Multi-chain portfolio viewer",
            url: NEXT_PUBLIC_METADATA_URL,
            icons: [`${NEXT_PUBLIC_METADATA_URL}/placeholder.svg?height=128&width=128&query=app%20icon`],
            redirect: {
              universal: NEXT_PUBLIC_METADATA_URL,
              // Prefer deep links if your app has a native scheme; can be empty if not applicable
              // native: "strabase://",
              // Some AppKit versions accept a linkMode to prefer deep linking:
              // linkMode: "deep",
            },
          },
          connectMethodsOrder: ["walletConnect", "injected", "coinbaseWallet"],
          features: {
            email: false,
            socials: false,
          },
        })
        initialized = true
      } catch (e) {
        console.error("[AppKit] init failed:", e)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
