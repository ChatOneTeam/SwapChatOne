/**
 * AppKit Configuration
 * 
 * 这是一个可移植的 AppKit 配置文件，可以轻松地在不同项目中使用
 * 
 * 使用方式：
 * 1. 确保环境变量 VITE_WALLET_CONNECT_PROJECT_ID 已设置
 * 2. 导入并调用 setupAppKit() 在应用启动时
 * 3. 使用 AppKitProvider 包裹你的应用
 */

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { bsc, bscTestnet } from '@reown/appkit/networks'
import { env, isAnalyticsEnabled } from '@/utils/env'

// 支持的网络列表
export const supportedNetworks = [bsc, bscTestnet]

// 应用元数据配置
export const appMetadata = {
  name: 'ChatOneSwap',
  description: 'ChatOneSwap - Decentralized Exchange',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://chatoneswap.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932'] // 可以替换为你的应用图标
}

/**
 * 初始化 AppKit
 * 必须在 React 组件外部调用
 */
export function setupAppKit() {
  // 验证项目 ID
  if (!env.VITE_WALLET_CONNECT_PROJECT_ID) {
    throw new Error('VITE_WALLET_CONNECT_PROJECT_ID is required')
  }

  // 创建 Wagmi Adapter
  const wagmiAdapter = new WagmiAdapter({
    networks: supportedNetworks,
    projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
    ssr: true, // 支持服务端渲染
  })

  // 创建 AppKit 实例
   
  createAppKit({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapters: [wagmiAdapter as any], // Type assertion for compatibility with AppKit types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    networks: supportedNetworks as any, // Type assertion for compatibility
    projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
    metadata: appMetadata,
    features: {
      analytics: isAnalyticsEnabled, // 可选 - 默认使用 Cloud 配置
    },
  })

  return wagmiAdapter
}

/**
 * 获取默认的 Wagmi 配置
 * 用于在 AppKitProvider 中使用
 */
export function getWagmiAdapter() {
  return new WagmiAdapter({
    networks: supportedNetworks,
    projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
    ssr: true,
  })
}

