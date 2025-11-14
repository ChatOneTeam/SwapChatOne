import { useState, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { useSwap } from '@/hooks/useSwap'
import { useSecurity } from '@/hooks/useSecurity'
import { validateTokenAmount } from '@/utils/security'
import { formatErrorMessage } from '@/utils/errors'
import TokenSelect, { type Token } from '@/components/TokenSelect'
import NumberInput from '@/components/NumberInput'

// Token list - in production, this would come from a token registry
const TOKENS: Token[] = [
  { symbol: 'BNB', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
  { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
]

export default function Swap() {
  const { address, isConnected } = useAccount()
  const { t } = useTranslation()
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
        setValidationError(validation.error || t('swap.invalidAmount'))
        setAmountOut('0.0')
        return
      }

      // TODO: Calculate amount out based on pool reserves
      // For now, just show placeholder
      setAmountOut('0.0')
    },
    [t]
  )

  // Swap tokens
  const handleSwap = useCallback(async () => {
    if (!isConnected || !address) {
      return
    }

    // Check rate limit
    if (!checkActionRateLimit('swap', 10, 60000)) {
      setValidationError(t('swap.tooManyAttempts'))
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
      setValidationError(validation.error || t('swap.invalidSwapParams'))
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
    t,
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
    if (!isConnected) return t('common.connectWallet')
    if (isLoading) return t('swap.processing')
    if (txHash) return t('swap.transactionSubmitted')
    return t('swap.swap')
  }, [isConnected, isLoading, txHash, t])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-dark rounded-2xl shadow-glow-lg p-4 sm:p-6 border border-white/30">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gradient-cyan">{t('swap.title')}</h1>

        {!isConnected && (
          <div className="mb-4 p-3 sm:p-4 bg-yellow-50/80 border border-yellow-200/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm sm:text-base text-yellow-800">
              {t('swap.connectWalletToSwap')}
            </p>
          </div>
        )}

        {(validationError || swapError) && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50/80 border border-red-200/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm sm:text-base text-red-800 break-words">
              {validationError || formatErrorMessage(swapError)}
            </p>
          </div>
        )}

        {txHash && (
          <div className="mb-4 p-3 sm:p-4 bg-green-50/80 border border-green-200/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm sm:text-base text-green-800 break-words">
              {t('swap.transactionSubmitted')}! Hash: {txHash.slice(0, 10)}...
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary-600 hover:text-primary-700 hover:underline transition-colors"
              >
                {t('swap.viewOnBscScan')}
              </a>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('swap.from')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <NumberInput
                value={amountIn}
                onChange={handleAmountChange}
                placeholder="0.0"
                disabled={!isConnected || isLoading}
                maxDecimals={18}
                error={!!validationError}
                className="flex-1"
              />
              <div className="w-full sm:w-auto sm:min-w-[140px]">
                <TokenSelect
                  tokens={TOKENS}
                  value={tokenIn}
                  onChange={(value) => {
                    setTokenIn(value)
                    setValidationError(null)
                  }}
                  placeholder={t('swap.selectToken')}
                  disabled={!isConnected || isLoading}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              className="p-3 sm:p-2 text-primary-400 hover:text-primary-600 active:text-primary-700 transition-all duration-200 touch-manipulation hover:scale-110"
              onClick={() => {
                const temp = tokenIn
                setTokenIn(tokenOut)
                setTokenOut(temp)
                setValidationError(null)
              }}
              disabled={!isConnected || isLoading}
              aria-label="Swap tokens"
            >
              <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('swap.to')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <NumberInput
                value={amountOut}
                onChange={() => {}}
                placeholder="0.0"
                readOnly
                disabled={!isConnected || isLoading}
                className="flex-1"
              />
              <div className="w-full sm:w-auto sm:min-w-[140px]">
                <TokenSelect
                  tokens={TOKENS}
                  value={tokenOut}
                  onChange={(value) => {
                    setTokenOut(value)
                    setValidationError(null)
                  }}
                  placeholder={t('swap.selectToken')}
                  disabled={!isConnected || isLoading}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSwap}
            disabled={!canSwap || isLoading}
            className="w-full py-4 sm:py-3 text-base sm:text-sm font-medium bg-gradient-tech text-white rounded-xl hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Execute swap"
          >
            {swapButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}

