/**
 * @chatoneswap/wallet
 * 
 * 可复用的钱包连接包，基于 AppKit 和 Wagmi
 */

// Export types
export type { WalletConfig, AppKitProviderProps } from './types'

// Export provider
export { AppKitProvider } from './provider/AppKitProvider'

// Export components
export { WalletConnect, WalletConnectButton } from './components/WalletConnect'
export type { WalletConnectProps } from './components/WalletConnect'

// Export config utilities
export { setupAppKit } from './config/appkit'

