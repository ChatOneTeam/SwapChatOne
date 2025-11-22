/**
 * AppKit Configuration
 * 
 * 通用的 AppKit 配置，可以在不同项目中使用
 */

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { WalletConfig } from '../types'
import { DEFAULT_PROJECT_ID, DEFAULT_ANALYTICS_ENABLED } from '../constant'

/**
 * 初始化 AppKit
 * 必须在 React 组件外部调用
 */
export function setupAppKit(config: WalletConfig) {
  // 获取项目 ID（从配置或环境变量）
  const projectId = config.projectId || DEFAULT_PROJECT_ID
  const defaultNetworks = config.networks || []

  // 创建 Wagmi Adapter
  // 注意：WagmiAdapter 默认包含多种连接方式，包括 WalletConnect、Coinbase、Injected 等
  // 邮箱登录功能由 AppKit 的 Cloud 配置控制，如果不需要邮箱登录，需要在 Reown Dashboard 中禁用
  const wagmiAdapter = new WagmiAdapter({
    networks: defaultNetworks,
    projectId,
    ssr: config.ssr !== false, // 默认启用 SSR
  })

  // 应用元数据配置
  const appMetadata = {
    name: config.metadata?.name || 'Web3 App',
    description: config.metadata?.description || 'Web3 Application',
    url: config.metadata?.url || (typeof window !== 'undefined' ? window.location.origin : 'https://example.com'),
    icons: config.metadata?.icons || [],
  }

  // 创建 AppKit 实例
  // 配置说明：
  // - metadata: 应用元数据，不包含邮箱字段
  // - features: 功能配置，analytics 控制分析功能
  // - 邮箱登录功能需要在 Reown Dashboard (https://dashboard.reown.com) 中禁用
  createAppKit({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapters: [wagmiAdapter as any],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    networks: defaultNetworks as any,
    projectId,
    metadata: appMetadata,
    features: {
      analytics: config.enableAnalytics !== undefined ? config.enableAnalytics : DEFAULT_ANALYTICS_ENABLED,
      // 注意：邮箱登录功能由 Cloud 配置控制，需要在 Dashboard 中设置
      // 这里不包含 email 相关的配置，确保只使用钱包连接方式
    },
  })

  return wagmiAdapter
}

