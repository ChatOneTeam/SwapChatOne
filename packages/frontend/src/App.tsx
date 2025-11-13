import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppKitProvider } from './components/AppKitProvider'
import Layout from './components/Layout'

// Lazy load routes for code splitting
const Swap = lazy(() => import('./views/Swap'))
const Liquidity = lazy(() => import('./views/Liquidity'))
const Pools = lazy(() => import('./views/Pools'))

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
      <AppKitProvider>
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
      </AppKitProvider>
    </ErrorBoundary>
  )
}

export default App

