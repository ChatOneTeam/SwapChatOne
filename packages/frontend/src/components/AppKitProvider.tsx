/**
 * AppKitProvider Component
 * 
 * 封装的 AppKit Provider 组件，可以轻松移植到其他项目
 * 
 * 使用方式：
 * <AppKitProvider>
 *   <YourApp />
 * </AppKitProvider>
 */

import { ReactNode, useMemo, useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupAppKit } from '@/config/appkit'
import type { WagmiAdapter as WagmiAdapterType } from '@reown/appkit-adapter-wagmi'

// 初始化 AppKit（必须在组件外部调用，且只调用一次）
let wagmiAdapter: WagmiAdapterType | null = null
let isInitialized = false

function initializeAppKit() {
  if (typeof window === 'undefined' || isInitialized) {
    return wagmiAdapter
  }
  
  try {
    wagmiAdapter = setupAppKit()
    isInitialized = true
  } catch (error) {
    console.error('Failed to initialize AppKit:', error)
  }
  
  return wagmiAdapter
}

// 创建 QueryClient（可以在组件外部创建，避免重复创建）
const queryClient = new QueryClient({
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

interface AppKitProviderProps {
  children: ReactNode
  /**
   * 自定义 QueryClient（可选）
   */
  queryClient?: QueryClient
}

/**
 * AppKit Provider 组件
 * 
 * 这个组件封装了 WagmiProvider 和 QueryClientProvider
 * 提供了完整的 Web3 功能支持
 */
export function AppKitProvider({ 
  children, 
  queryClient: customQueryClient 
}: AppKitProviderProps) {
  const [adapter, setAdapter] = useState<WagmiAdapterType | null>(wagmiAdapter)
  const [error, setError] = useState<string | null>(null)

  // 使用自定义 QueryClient 或默认的
  const client = useMemo(() => customQueryClient || queryClient, [customQueryClient])

  // 在客户端初始化
  useEffect(() => {
    if (typeof window !== 'undefined' && !adapter) {
      try {
        const initializedAdapter = initializeAppKit()
        if (initializedAdapter) {
          setAdapter(initializedAdapter)
        } else {
          setError('Failed to initialize AppKit. Please check VITE_WALLET_CONNECT_PROJECT_ID environment variable.')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(`AppKit initialization error: ${errorMessage}`)
        console.error('AppKit initialization error:', err)
      }
    }
  }, [adapter])

  // 如果初始化失败，显示错误
  if (error || (!adapter && typeof window !== 'undefined')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 text-xl font-bold mb-2">初始化失败</div>
          <p className="text-gray-600 mb-4">
            {error || '请检查环境变量 VITE_WALLET_CONNECT_PROJECT_ID 是否已设置'}
          </p>
          <p className="text-sm text-gray-500">
            请确保在 .env 文件中设置了正确的 WalletConnect Project ID
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

