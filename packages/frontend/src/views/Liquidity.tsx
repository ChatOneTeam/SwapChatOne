import { useState, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useLiquidity } from '@/hooks/useLiquidity'
import { useSecurity } from '@/hooks/useSecurity'
import { validateTokenAmount } from '@/utils/security'
import { formatErrorMessage } from '@/utils/errors'
import { formatTokenAmount } from '@/utils/format'
import Loading from '@/components/Loading'

// Token list - in production, this would come from a token registry
const TOKENS = [
  { symbol: 'BNB', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
  { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
] as const

type TabType = 'add' | 'remove'

export default function Liquidity() {
  const { address, isConnected } = useAccount()
  const { addLiquidity, removeLiquidity, isLoading, error, txHash, validateAddLiquidityInput, validateRemoveLiquidityInput } = useLiquidity()
  const { secureAction, checkActionRateLimit } = useSecurity()

  const [activeTab, setActiveTab] = useState<TabType>('add')
  const [tokenA, setTokenA] = useState('')
  const [tokenB, setTokenB] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [liquidityAmount, setLiquidityAmount] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Validate amount inputs
  const handleAmountAChange = useCallback((value: string) => {
    setAmountA(value)
    setValidationError(null)

    if (!value || value.trim() === '') {
      setAmountB('')
      return
    }

    const validation = validateTokenAmount(value)
    if (!validation.isValid) {
      setValidationError(`Token A: ${validation.error}`)
      return
    }

    // TODO: Calculate amountB based on pool ratio
    // For now, just clear amountB
    setAmountB('')
  }, [])

  const handleAmountBChange = useCallback((value: string) => {
    setAmountB(value)
    setValidationError(null)

    if (!value || value.trim() === '') {
      return
    }

    const validation = validateTokenAmount(value)
    if (!validation.isValid) {
      setValidationError(`Token B: ${validation.error}`)
    }
  }, [])

  // Add liquidity
  const handleAddLiquidity = useCallback(async () => {
    if (!isConnected || !address) {
      return
    }

    if (!checkActionRateLimit('addLiquidity', 5, 60000)) {
      setValidationError('Too many attempts. Please wait a moment.')
      return
    }

    const validation = validateAddLiquidityInput({
      tokenA: TOKENS.find((t) => t.symbol === tokenA)?.address || '',
      tokenB: TOKENS.find((t) => t.symbol === tokenB)?.address || '',
      amountA,
      amountB,
      to: address,
    })

    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid parameters')
      return
    }

    try {
      await secureAction(
        'addLiquidity',
        async () => {
          await addLiquidity({
            tokenA: TOKENS.find((t) => t.symbol === tokenA)?.address || '',
            tokenB: TOKENS.find((t) => t.symbol === tokenB)?.address || '',
            amountA,
            amountB,
            to: address,
            deadline: Math.floor(Date.now() / 1000) + 1200,
          })
        },
        { maxAttempts: 5, windowMs: 60000 }
      )
    } catch (err) {
      setValidationError(formatErrorMessage(err))
    }
  }, [isConnected, address, tokenA, tokenB, amountA, amountB, addLiquidity, validateAddLiquidityInput, secureAction, checkActionRateLimit])

  // Remove liquidity
  const handleRemoveLiquidity = useCallback(async () => {
    if (!isConnected || !address) {
      return
    }

    if (!checkActionRateLimit('removeLiquidity', 5, 60000)) {
      setValidationError('Too many attempts. Please wait a moment.')
      return
    }

    const validation = validateRemoveLiquidityInput({
      tokenA: TOKENS.find((t) => t.symbol === tokenA)?.address || '',
      tokenB: TOKENS.find((t) => t.symbol === tokenB)?.address || '',
      liquidity: liquidityAmount,
      amountAMin: '0',
      amountBMin: '0',
      to: address,
    })

    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid parameters')
      return
    }

    try {
      await secureAction(
        'removeLiquidity',
        async () => {
          await removeLiquidity({
            tokenA: TOKENS.find((t) => t.symbol === tokenA)?.address || '',
            tokenB: TOKENS.find((t) => t.symbol === tokenB)?.address || '',
            liquidity: liquidityAmount,
            amountAMin: '0',
            amountBMin: '0',
            to: address,
            deadline: Math.floor(Date.now() / 1000) + 1200,
          })
        },
        { maxAttempts: 5, windowMs: 60000 }
      )
    } catch (err) {
      setValidationError(formatErrorMessage(err))
    }
  }, [isConnected, address, tokenA, tokenB, liquidityAmount, removeLiquidity, validateRemoveLiquidityInput, secureAction, checkActionRateLimit])

  const canAddLiquidity = useMemo(() => {
    return (
      isConnected &&
      !!tokenA &&
      !!tokenB &&
      !!amountA &&
      !!amountB &&
      tokenA !== tokenB &&
      !validationError &&
      !error
    )
  }, [isConnected, tokenA, tokenB, amountA, amountB, validationError, error])

  const canRemoveLiquidity = useMemo(() => {
    return (
      isConnected &&
      !!tokenA &&
      !!tokenB &&
      !!liquidityAmount &&
      tokenA !== tokenB &&
      !validationError &&
      !error
    )
  }, [isConnected, tokenA, tokenB, liquidityAmount, validationError, error])

  if (isLoading) {
    return <Loading text="Processing transaction..." fullScreen />
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Manage Liquidity</h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => {
              setActiveTab('add')
              setValidationError(null)
            }}
            className={`px-4 py-2 font-medium ${
              activeTab === 'add'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Add Liquidity
          </button>
          <button
            onClick={() => {
              setActiveTab('remove')
              setValidationError(null)
            }}
            className={`px-4 py-2 font-medium ${
              activeTab === 'remove'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Remove Liquidity
          </button>
        </div>

        {!isConnected && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800">Please connect your wallet to manage liquidity</p>
          </div>
        )}

        {(validationError || error) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{validationError || formatErrorMessage(error)}</p>
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

        {activeTab === 'add' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token A
              </label>
              <select
                value={tokenA}
                onChange={(e) => {
                  setTokenA(e.target.value)
                  setValidationError(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected || isLoading}
              >
                <option value="">Select token</option>
                {TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount A
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                placeholder="0.0"
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  validationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={!isConnected || isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token B
              </label>
              <select
                value={tokenB}
                onChange={(e) => {
                  setTokenB(e.target.value)
                  setValidationError(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected || isLoading}
              >
                <option value="">Select token</option>
                {TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount B
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amountB}
                onChange={(e) => handleAmountBChange(e.target.value)}
                placeholder="0.0"
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  validationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={!isConnected || isLoading}
              />
            </div>

            <button
              onClick={handleAddLiquidity}
              disabled={!canAddLiquidity || isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Add Liquidity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token A
              </label>
              <select
                value={tokenA}
                onChange={(e) => {
                  setTokenA(e.target.value)
                  setValidationError(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected || isLoading}
              >
                <option value="">Select token</option>
                {TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token B
              </label>
              <select
                value={tokenB}
                onChange={(e) => {
                  setTokenB(e.target.value)
                  setValidationError(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected || isLoading}
              >
                <option value="">Select token</option>
                {TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Liquidity Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={liquidityAmount}
                onChange={(e) => {
                  setLiquidityAmount(e.target.value)
                  setValidationError(null)
                }}
                placeholder="0.0"
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  validationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={!isConnected || isLoading}
              />
            </div>

            <button
              onClick={handleRemoveLiquidity}
              disabled={!canRemoveLiquidity || isLoading}
              className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Remove Liquidity
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
