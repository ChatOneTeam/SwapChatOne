/**
 * AppKitProvider Component
 * 
 * 封装的 AppKit Provider 组件，可以轻松移植到其他项目
 * 
 * 使用方式：
 * <AppKitProvider config={walletConfig}>
 *   <YourApp />
 * </AppKitProvider>
 */

import { useMemo, useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupAppKit } from '../config/appkit'
import type { WalletConfig, AppKitProviderProps } from '../types'
import type { WagmiAdapter as WagmiAdapterType } from '@reown/appkit-adapter-wagmi'

// 初始化 AppKit（必须在组件外部调用，且只调用一次）
let wagmiAdapter: WagmiAdapterType | null = null  

function initializeAppKit(config: WalletConfig) {
  // 如果已经初始化，直接返回
  if (typeof window === 'undefined') {
    return wagmiAdapter   
  }
  
  // 获取 projectId（从配置或环境变量）
  wagmiAdapter = setupAppKit(config)
  return wagmiAdapter
}

// 创建默认 QueryClient（可以在组件外部创建，避免重复创建）
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
})

/**
 * AppKit Provider 组件
 * 
 * 这个组件封装了 WagmiProvider 和 QueryClientProvider
 * 提供了完整的 Web3 功能支持
 */
export function AppKitProvider({ 
  children, 
  config,
  queryClient: customQueryClient 
}: AppKitProviderProps) {
  const [adapter, setAdapter] = useState<WagmiAdapterType | null>(wagmiAdapter)
  const [error, setError] = useState<string | null>(null)

  // 使用自定义 QueryClient 或默认的
  const client = useMemo(() => customQueryClient || defaultQueryClient, [customQueryClient])

  // 在客户端初始化
  useEffect(() => {
    if (typeof window !== 'undefined' && !adapter) {
      try {
        const initializedAdapter = initializeAppKit(config)
        if (initializedAdapter) {
          setAdapter(initializedAdapter)
        } else {
          setError('Failed to initialize AppKit. Please check WalletConnect Project ID.')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(`AppKit initialization error: ${errorMessage}`)
        console.error('AppKit initialization error:', err)
      }
    }
  }, [adapter, config])

  // 如果初始化失败，显示错误
  if (error || (!adapter && typeof window !== 'undefined')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 text-xl font-bold mb-2">初始化失败</div>
          <p className="text-gray-600 mb-4">
            {error || '请检查 WalletConnect Project ID 是否已设置'}
          </p>
          <p className="text-sm text-gray-500">
            请确保在配置中设置了正确的 WalletConnect Project ID
          </p>
        </div>
      </div>
    )
  }

  // 如果还没有初始化（SSR），显示加载状态
  if (!adapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">初始化中...</p>
        </div>
      </div>
    )
  }

  return (
    <WagmiProvider config={adapter.wagmiConfig}>
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

