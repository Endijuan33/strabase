import type React from "react"
/**
 * Global JSX types for Reown AppKit web components.
 */
declare namespace JSX {
  interface IntrinsicElements {
    "appkit-connect-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      size?: "sm" | "md"
      label?: string
      loadingLabel?: string
    }
  }
}
