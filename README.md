# strabase-portofolio

A production-ready Next.js 15 (App Router) + TypeScript + TailwindCSS multi-chain crypto portfolio viewer powered by Covalent and Reown AppKit (Ethers adapter). Connect any EVM wallet, fetch balances across 200+ chains server-side, and send native/ERC20 tokens from a clean, responsive UI with dark mode.

## Tech Stack
- Next.js 15 (App Router) + TypeScript (strict)
- TailwindCSS (dark mode)
- Reown AppKit v1.8.9 + EthersAdapter
- Covalent (GoldRush) API
- Axios + Zod
- Deployed locally or via Vercel

## Features
- Wallet connection via Reown AppKit with EthersAdapter
- Mobile linking (Android Chrome → installed wallets) with redirect metadata
- Multi-chain portfolio via Covalent: token logo, symbol, chain, balances, and USD value
- Unified server-side route /api/portfolio with batching/rate limiting
- Token transfers:
  - sendNativeToken(to, amount)
  - sendERC20Token(tokenAddress, to, amount)
- Robust UI states (loading/error/empty), responsive grid, dark mode toggle
- Full type safety and clear comments

## Prerequisites
- Node.js 18+ (LTS recommended) or Node 20+
- npm (bundled with Node)
- A Reown Project ID and Covalent API key

## Environment Variables
Add the following:
- NEXT_PUBLIC_PROJECT_ID=your-reown-project-id
- NEXT_PUBLIC_METADATA_URL=http://localhost:9002
- COVALENT_API_KEY=your-covalent-api-key

v0 (in this chat):
- Use the Vars sidebar to add: COVALENT_API_KEY, NEXT_PUBLIC_PROJECT_ID, NEXT_PUBLIC_METADATA_URL.

Local development:
- Create .env.local in the project root:
  \`\`\`
  NEXT_PUBLIC_PROJECT_ID=620b133244942ea33b40c79f8be5de48
  NEXT_PUBLIC_METADATA_URL=http://localhost:9002
  COVALENT_API_KEY=cqt_rQDwwpwTV6qqPF9JH6YGcMHKCptY
  \`\`\`
Note: The app validates envs at runtime using Zod and throws descriptive errors if missing.

## Install and Run
1) Install dependencies:
   npm install

2) Development (port 9002):
   npm run dev
   Open http://localhost:9002

3) Production:
   npm run build
   npm start
   Open http://localhost:9002

These scripts are configured to run on port 9002.

## Folder Structure
- src/
  - app/
    - layout.tsx
    - page.tsx
    - globals.css
    - api/portfolio/route.ts
  - lib/
    - env.ts
    - covalent.ts
    - wallet.ts
  - components/
    - PortfolioGrid.tsx
    - TokenCard.tsx
    - Loader.tsx
    - ErrorMessage.tsx
  - providers/
    - AppKitProvider.tsx
  - types/
    - appkit.d.ts

## How It Works

### Wallet Connect (Reown AppKit + EthersAdapter)
- The AppKit is initialized client-side in providers/AppKitProvider.tsx with dynamic import to avoid SSR issues.
- We render the web component <appkit-connect-button /> on the page to open the modal.
- Mobile linking is enabled using redirect metadata (native/universal) so Android Chrome can deep-link into installed wallets and return.

### Portfolio API
- Endpoint: GET /api/portfolio?address=0xYourAddress
- Server-side fetch:
  - Gets chain list dynamically from Covalent /v1/chains
  - Batches balance requests with concurrency limits and retries
  - Returns a unified, typed JSON response
- The client UI calls this endpoint and renders grouped by chain with token details.

Example:
curl "http://localhost:9002/api/portfolio?address=0x0000000000000000000000000000000000000000"

### Token Transfers
- src/lib/wallet.ts exposes:
  - sendNativeToken(to: string, amount: string)
  - sendERC20Token(tokenAddress: string, to: string, amount: string)
- Requirements:
  - The connected wallet must be on the appropriate chain and have sufficient balance for gas.
  - Amount is a string; function will convert to appropriate units via ethers utils.

### Styling
- TailwindCSS with dark mode; semantic tokens used via globals.css
- Responsive grid with hover animations
- Accessible components and alt text where appropriate

## Troubleshooting

- The "@reown/appkit" module does not provide an export named "WalletConnectConnector"
  - We dynamically import AppKit on the client so bundlers do not statically resolve optional internals. Ensure you are not importing connector names directly from @reown/appkit.

- Env validation error
  - Ensure all required envs are present. In v0, set them in Vars. Locally, set in .env.local.

- Covalent rate limits
  - The API route batches requests and limits concurrency. If you still see 429s, try again later or reduce requested chains.

- Wallet not connecting on Android
  - Ensure a compatible wallet is installed and that redirect metadata is set (native/universal). Try opening the site in Chrome and using the connect button.

## Security Notes
- The Covalent API key is only used server-side in /api/portfolio.
- No private keys are stored; transactions are requested via the connected wallet.

## License
MIT — see LICENSE file.

## Contributing
Issues and PRs are welcome. Please keep TypeScript strict and follow the established patterns for API and UI components.
