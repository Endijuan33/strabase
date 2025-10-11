import { BrowserProvider, Contract, parseEther, parseUnits } from "ethers"

// Minimal ERC20 ABI for decimals + transfer
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
]

/**
 * Returns EIP-1193 provider if available
 */
function getWindowProvider(): any | null {
  const eth = (globalThis as any)?.ethereum
  return eth || null
}

/**
 * Gets the currently connected address (if any). Does not request permissions.
 */
export async function getConnectedAddress(): Promise<string> {
  const eth = getWindowProvider()
  if (!eth) return ""
  const accounts = await eth.request({ method: "eth_accounts" }).catch(() => [])
  return accounts?.[0] || ""
}

/**
 * Sends native token (e.g., ETH) using the current wallet signer.
 * amount is a decimal string (e.g., "0.01").
 */
export async function sendNativeToken(to: string, amount: string): Promise<string> {
  const eth = getWindowProvider()
  if (!eth) throw new Error("No EVM wallet detected. Please install or connect a wallet.")
  const provider = new BrowserProvider(eth)
  const signer = await provider.getSigner()
  const tx = await signer.sendTransaction({
    to,
    value: parseEther(amount),
  })
  const receipt = await tx.wait()
  return receipt?.hash ?? tx?.hash
}

/**
 * Sends ERC20 token using its contract address.
 * Reads decimals from the token contract to parse amount accurately.
 */
export async function sendERC20Token(tokenAddress: string, to: string, amount: string): Promise<string> {
  const eth = getWindowProvider()
  if (!eth) throw new Error("No EVM wallet detected. Please install or connect a wallet.")
  const provider = new BrowserProvider(eth)
  const signer = await provider.getSigner()

  const erc20 = new Contract(tokenAddress, ERC20_ABI, signer)
  const decimals: number = await erc20.decimals()
  const value = parseUnits(amount, decimals)
  const tx = await erc20.transfer(to, value)
  const receipt = await tx.wait()
  return receipt?.hash ?? tx?.hash
}
