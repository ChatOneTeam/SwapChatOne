import { useState, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useSwap } from '@/hooks/useSwap'
import { useSecurity } from '@/hooks/useSecurity'
import { validateTokenAmount } from '@/utils/security'
import { formatErrorMessage } from '@/utils/errors'

// Token list - in production, this would come from a token registry
const TOKENS = [
  { symbol: 'BNB', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' },
  { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955' },
] as const

export default function Swap() {
  const { address, isConnected } = useAccount()
  const { swap, isLoading, error: swapError, txHash, validateSwapInput } = useSwap()
  const { secureAction, checkActionRateLimit } = useSecurity()

  const [tokenIn, setTokenIn] = useState('')
  const [tokenOut, setTokenOut] = useState('')
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('0.0')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Validate amount input on change
  const handleAmountChange = useCallback(
    (value: string) => {
      setAmountIn(value)
      setValidationError(null)

      if (!value || value.trim() === '') {
        setAmountOut('0.0')
        return
      }

      const validation = validateTokenAmount(value)
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid amount')
        setAmountOut('0.0')
        return
      }

      // TODO: Calculate amount out based on pool reserves
      // For now, just show placeholder
      setAmountOut('0.0')
    },
    []
  )

  // Swap tokens
  const handleSwap = useCallback(async () => {
    if (!isConnected || !address) {
      return
    }

    // Check rate limit
    if (!checkActionRateLimit('swap', 10, 60000)) {
      setValidationError('Too many swap attempts. Please wait a moment.')
      return
    }

    // Validate input
    const validation = validateSwapInput({
      tokenIn: TOKENS.find((t) => t.symbol === tokenIn)?.address || '',
      tokenOut: TOKENS.find((t) => t.symbol === tokenOut)?.address || '',
      amountIn,
      amountOutMin: '0', // TODO: Calculate slippage tolerance
      to: address,
    })

    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid swap parameters')
      return
    }

    try {
      await secureAction(
        'swap',
        async () => {
          await swap({
            tokenIn: TOKENS.find((t) => t.symbol === tokenIn)?.address || '',
            tokenOut: TOKENS.find((t) => t.symbol === tokenOut)?.address || '',
            amountIn,
            amountOutMin: '0',
            to: address,
            deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
          })
        },
        { maxAttempts: 10, windowMs: 60000 }
      )
    } catch (err) {
      setValidationError(formatErrorMessage(err))
    }
  }, [
    isConnected,
    address,
    tokenIn,
    tokenOut,
    amountIn,
    swap,
    validateSwapInput,
    secureAction,
    checkActionRateLimit,
  ])

  // Swap button state
  const canSwap = useMemo(() => {
    return (
      isConnected &&
      !!tokenIn &&
      !!tokenOut &&
      !!amountIn &&
      tokenIn !== tokenOut &&
      !validationError &&
      !swapError
    )
  }, [isConnected, tokenIn, tokenOut, amountIn, validationError, swapError])

  // Swap button text
  const swapButtonText = useMemo(() => {
    if (!isConnected) return 'Connect Wallet'
    if (isLoading) return 'Processing...'
    if (txHash) return 'Transaction Submitted'
    return 'Swap'
  }, [isConnected, isLoading, txHash])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Swap Tokens</h1>

        {!isConnected && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800">
              Please connect your wallet to swap tokens
            </p>
          </div>
        )}

        {(validationError || swapError) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">
              {validationError || formatErrorMessage(swapError)}
            </p>
          </div>
        )}

        {txHash && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">
              Transaction submitted! Hash: {txHash.slice(0, 10)}...
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:underline"
              >
                View on BscScan
              </a>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                inputMode="decimal"
                value={amountIn}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.0"
                className={`flex-1 px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  validationError
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                disabled={!isConnected || isLoading}
                aria-label="Amount to swap"
              />
              <select
                value={tokenIn}
                onChange={(e) => {
                  setTokenIn(e.target.value)
                  setValidationError(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected || isLoading}
                aria-label="Token to swap from"
              >
                <option value="">Select token</option>
                {TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                const temp = tokenIn
                setTokenIn(tokenOut)
                setTokenOut(temp)
                setValidationError(null)
              }}
              disabled={!isConnected || isLoading}
              aria-label="Swap tokens"
            >
              ↓
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={amountOut}
                placeholder="0.0"
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                aria-label="Amount to receive"
              />
              <select
                value={tokenOut}
                onChange={(e) => {
                  setTokenOut(e.target.value)
                  setValidationError(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected || isLoading}
                aria-label="Token to swap to"
              >
                <option value="">Select token</option>
                {TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSwap}
            disabled={!canSwap || isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label="Execute swap"
          >
            {swapButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}

