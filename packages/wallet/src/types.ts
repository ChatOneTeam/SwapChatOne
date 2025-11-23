/**
 * Wallet package types
 */

import type { ReactNode } from 'react'

export interface WalletConfig {
  /**
   * WalletConnect Project ID (optional, will be read from defaultProjectId if not provided)
   */
  projectId?: string
  
  /**
   * Supported networks (from @reown/appkit/networks)
   */
  networks?: any[]
  
  /**
   * App metadata
   */
  metadata?: {
    name: string
    description: string
    url: string
    icons?: string[]
  }
  
  /**
   * Enable analytics (optional)
   */
  enableAnalytics?: boolean
  
  /**
   * Enable SSR support (default: true)
   */
  ssr?: boolean
}

export interface AppKitProviderProps {
  /**
   * React children
   */
  children: ReactNode
  
  /**
   * Wallet configuration
   */
  config: WalletConfig
  
  /**
   * Custom QueryClient (optional)
   */
  queryClient?: any
}

