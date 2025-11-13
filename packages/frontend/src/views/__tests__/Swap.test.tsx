import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { bscTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import Swap from '../Swap'

// Mock wagmi hooks
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi')
  return {
    ...actual,
    useAccount: () => ({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      isConnected: true,
    }),
  }
})

vi.mock('@/hooks/useSwap', () => ({
  useSwap: () => ({
    swap: vi.fn(),
    isLoading: false,
    isSuccess: false,
    error: null,
    txHash: null,
    validateSwapInput: vi.fn(() => ({ isValid: true })),
  }),
}))

vi.mock('@/hooks/useSecurity', () => ({
  useSecurity: () => ({
    secureAction: vi.fn((_, fn) => fn()),
    checkActionRateLimit: vi.fn(() => true),
    validateWalletAddress: vi.fn(() => true),
    csrfToken: 'test-token',
    validateCSRF: vi.fn(() => true),
  }),
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const wagmiConfig = createConfig({
  chains: [bscTestnet],
  connectors: [injected()],
  transports: {
    [bscTestnet.id]: http(),
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
)

describe('Swap component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render swap form', () => {
    render(<Swap />, { wrapper })
    expect(screen.getByText('Swap Tokens')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount to swap')).toBeInTheDocument()
    expect(screen.getByLabelText('Token to swap from')).toBeInTheDocument()
    expect(screen.getByLabelText('Token to swap to')).toBeInTheDocument()
  })

  it('should validate amount input', async () => {
    render(<Swap />, { wrapper })
    const amountInput = screen.getByLabelText('Amount to swap')

    // Test invalid input
    fireEvent.change(amountInput, { target: { value: 'abc' } })
    await waitFor(() => {
      expect(screen.getByText(/Invalid number format/i)).toBeInTheDocument()
    })

    // Test valid input
    fireEvent.change(amountInput, { target: { value: '100' } })
    await waitFor(() => {
      expect(screen.queryByText(/Invalid number format/i)).not.toBeInTheDocument()
    })
  })

  it('should disable swap button when form is invalid', () => {
    render(<Swap />, { wrapper })
    const swapButton = screen.getByLabelText('Execute swap')
    expect(swapButton).toBeDisabled()
  })

  it('should enable swap button when form is valid', async () => {
    render(<Swap />, { wrapper })

    // Fill in valid form data
    const amountInput = screen.getByLabelText('Amount to swap')
    const tokenInSelect = screen.getByLabelText('Token to swap from')
    const tokenOutSelect = screen.getByLabelText('Token to swap to')

    fireEvent.change(amountInput, { target: { value: '100' } })
    fireEvent.change(tokenInSelect, { target: { value: 'BNB' } })
    fireEvent.change(tokenOutSelect, { target: { value: 'USDT' } })

    await waitFor(() => {
      const swapButton = screen.getByLabelText('Execute swap')
      expect(swapButton).not.toBeDisabled()
    })
  })

  it('should show error message for invalid amount', async () => {
    render(<Swap />, { wrapper })
    const amountInput = screen.getByLabelText('Amount to swap')

    fireEvent.change(amountInput, { target: { value: '-100' } })

    await waitFor(() => {
      expect(screen.getByText(/Amount cannot be negative/i)).toBeInTheDocument()
    })
  })
})

