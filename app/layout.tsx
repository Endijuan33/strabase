import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* Header with GitHub link */}
        <Suspense fallback={<div>Loading...</div>}>
          <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-screen-2xl flex items-center justify-end p-3">
              <a
                href="https://github.com/endijuan33"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium underline-offset-4 hover:underline text-foreground"
                aria-label="View my GitHub profile"
                title="GitHub"
              >
                GitHub
              </a>
            </div>
          </header>
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
