"use client"

import type * as React from "react"
import { useState } from "react"
import { isAddress } from "ethers"
import { useRouter } from "next/navigation"

/**
 * AddressInput
 * - Client component that lets users paste or type an EVM address.
 * - Validates using ethers.isAddress before allowing submit.
 * - On submit, routes to "/?address=<address>" so the page can load that portfolio.
 */
export function AddressInput({
  initialAddress,
  onSubmit,
  busy = false,
}: {
  initialAddress?: string
  onSubmit?: (address: string) => void
  busy?: boolean
}) {
  const [value, setValue] = useState(initialAddress ?? "")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setValue(text.trim())
      setError(null)
    } catch (e) {
      setError("Clipboard access denied. Please paste manually.")
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const addr = value.trim()
    if (!isAddress(addr)) {
      setError("Please enter a valid EVM address (0x...)")
      return
    }
    setError(null)
    // Navigate so the page can load this portfolio via query params
    router.push(`/?address=${addr}`)
    // Also notify parent if it wants to handle custom logic
    onSubmit?.(addr)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <label htmlFor="manual-address" className="block text-sm font-medium mb-2">
        View any EVM portfolio by address
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id="manual-address"
          name="manual-address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0x1234...Paste an address"
          className="flex-1 rounded-md border border-(--border) bg-(--input) px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          aria-invalid={!!error}
          aria-describedby={error ? "manual-address-error" : undefined}
          disabled={busy}
        />
        <button
          type="button"
          onClick={handlePaste}
          className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2 text-sm font-medium text-(--secondary-foreground) hover:opacity-90 disabled:opacity-50"
          disabled={busy}
        >
          Paste
        </button>
        <button
          type="submit"
          className="rounded-md bg-(--primary) px-4 py-2 text-sm font-semibold text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
          disabled={busy}
        >
          View Portfolio
        </button>
      </div>
      {error ? (
        <p id="manual-address-error" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-(--muted-foreground)">
        Tip: You can view a portfolio even without connecting your wallet.
      </p>
    </form>
  )
}
