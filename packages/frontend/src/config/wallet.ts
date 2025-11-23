/**
 * Wallet Configuration
 * 
 * 钱包配置（projectId 现在由 wallet package 从环境变量自动读取）
 */

import { bsc, bscTestnet } from '@reown/appkit/networks'
import type { WalletConfig } from '@chatoneswap/wallet'

// 支持的网络列表
export const supportedNetworks = [bsc, bscTestnet]

// 应用元数据配置
export const appMetadata = {
  name: 'ChatOneSwap',
  description: 'ChatOneSwap - Decentralized Exchange',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://swapV3.chatone.info',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

/**
 * 获取钱包配置
 * 
 * 注意：projectId 现在由 @chatoneswap/wallet 自动从 defaultProjectId 环境变量读取
 */
export function getWalletConfig(): WalletConfig {
  return {
    // projectId 可选，如果不提供将从环境变量 defaultProjectId 读取
    networks: supportedNetworks,
    metadata: appMetadata,
    // enableAnalytics 可选，如果不提供将从环境变量 ENABLE_ANALYTICS 读取
    ssr: true,
  }
}

