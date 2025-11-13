import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { createWeb3Modal } from '@web3modal/wagmi'
import { wagmiConfig } from './config/wagmi'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import { env, isAnalyticsEnabled } from './utils/env'

// Lazy load routes for code splitting
const Swap = lazy(() => import('./views/Swap'))
const Liquidity = lazy(() => import('./views/Liquidity'))
const Pools = lazy(() => import('./views/Pools'))

// Create Web3Modal
createWeb3Modal({
  wagmiConfig,
  projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
  enableAnalytics: isAnalyticsEnabled,
})

// Configure React Query with error handling
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

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Swap />} />
                  <Route path="/swap" element={<Swap />} />
                  <Route path="/liquidity" element={<Liquidity />} />
                  <Route path="/pools" element={<Pools />} />
                </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  )
}

export default App

