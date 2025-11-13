import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { createWeb3Modal } from '@web3modal/wagmi'
import { wagmiConfig } from './config/wagmi'
import Layout from './components/Layout'
import Swap from './views/Swap'
import Liquidity from './views/Liquidity'
import Pools from './views/Pools'

// Create Web3Modal
createWeb3Modal({
  wagmiConfig,
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'your-project-id',
  enableAnalytics: false,
})

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Swap />} />
              <Route path="/swap" element={<Swap />} />
              <Route path="/liquidity" element={<Liquidity />} />
              <Route path="/pools" element={<Pools />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App

