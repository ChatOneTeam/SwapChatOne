import { useState, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { useLiquidity } from '@/hooks/useLiquidity'
import { useSecurity } from '@/hooks/useSecurity'
import { validateTokenAmount } from '@/utils/security'
import { formatErrorMessage } from '@/utils/errors'
import { formatTokenAmount } from '@/utils/format'
import Loading from '@/components/Loading'
import TokenSelect, { type Token } from '@/components/TokenSelect'
import NumberInput from '@/components/NumberInput'

// Token list - in production, this would come from a token registry
const TOKENS: Token[] = [
  { symbol: 'BNB', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
  { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
]

type TabType = 'add' | 'remove'

export default function Liquidity() {
  const { address, isConnected } = useAccount()
  const { t } = useTranslation()
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
      setValidationError(validation.error || t('liquidity.invalidParameters'))
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
      setValidationError(t('swap.tooManyAttempts'))
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
      setValidationError(validation.error || t('liquidity.invalidParameters'))
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
      <div className="glass-dark rounded-2xl shadow-glow-lg p-4 sm:p-6 border border-white/30">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gradient-cyan">{t('liquidity.title')}</h1>

        {/* Tabs */}
        <div className="flex space-x-2 sm:space-x-4 mb-4 sm:mb-6 border-b border-white/20 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('add')
              setValidationError(null)
            }}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium whitespace-nowrap transition-all duration-200 touch-manipulation ${
              activeTab === 'add'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-slate-600 hover:text-primary-600 active:text-primary-700'
            }`}
          >
            {t('liquidity.addLiquidity')}
          </button>
          <button
            onClick={() => {
              setActiveTab('remove')
              setValidationError(null)
            }}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium whitespace-nowrap transition-all duration-200 touch-manipulation ${
              activeTab === 'remove'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-slate-600 hover:text-primary-600 active:text-primary-700'
            }`}
          >
            {t('liquidity.removeLiquidity')}
          </button>
        </div>

        {!isConnected && (
          <div className="mb-4 p-3 sm:p-4 bg-yellow-50/80 border border-yellow-200/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm sm:text-base text-yellow-800">{t('liquidity.connectWalletToManage')}</p>
          </div>
        )}

        {(validationError || error) && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50/80 border border-red-200/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm sm:text-base text-red-800 break-words">{validationError || formatErrorMessage(error)}</p>
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

        {activeTab === 'add' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('liquidity.tokenA')}
              </label>
              <TokenSelect
                tokens={TOKENS}
                value={tokenA}
                onChange={(value) => {
                  setTokenA(value)
                  setValidationError(null)
                }}
                placeholder={t('swap.selectToken')}
                disabled={!isConnected || isLoading}
              />
            </div>

            <div>
              <NumberInput
                value={amountA}
                onChange={handleAmountAChange}
                placeholder="0.0"
                disabled={!isConnected || isLoading}
                maxDecimals={18}
                error={!!validationError}
                label={t('liquidity.amountA')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('liquidity.tokenB')}
              </label>
              <TokenSelect
                tokens={TOKENS}
                value={tokenB}
                onChange={(value) => {
                  setTokenB(value)
                  setValidationError(null)
                }}
                placeholder={t('swap.selectToken')}
                disabled={!isConnected || isLoading}
              />
            </div>

            <div>
              <NumberInput
                value={amountB}
                onChange={handleAmountBChange}
                placeholder="0.0"
                disabled={!isConnected || isLoading}
                maxDecimals={18}
                error={!!validationError}
                label={t('liquidity.amountB')}
              />
            </div>

            <button
              onClick={handleAddLiquidity}
              disabled={!canAddLiquidity || isLoading}
              className="w-full py-4 sm:py-3 text-base sm:text-sm font-medium bg-gradient-tech text-white rounded-xl hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('liquidity.add')} {t('liquidity.addLiquidity')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('liquidity.tokenA')}
              </label>
              <TokenSelect
                tokens={TOKENS}
                value={tokenA}
                onChange={(value) => {
                  setTokenA(value)
                  setValidationError(null)
                }}
                placeholder={t('swap.selectToken')}
                disabled={!isConnected || isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('liquidity.tokenB')}
              </label>
              <TokenSelect
                tokens={TOKENS}
                value={tokenB}
                onChange={(value) => {
                  setTokenB(value)
                  setValidationError(null)
                }}
                placeholder={t('swap.selectToken')}
                disabled={!isConnected || isLoading}
              />
            </div>

            <div>
              <NumberInput
                value={liquidityAmount}
                onChange={(value) => {
                  setLiquidityAmount(value)
                  setValidationError(null)
                }}
                placeholder="0.0"
                disabled={!isConnected || isLoading}
                maxDecimals={18}
                error={!!validationError}
                label={t('liquidity.liquidityAmount')}
              />
            </div>

            <button
              onClick={handleRemoveLiquidity}
              disabled={!canRemoveLiquidity || isLoading}
              className="w-full py-4 sm:py-3 text-base sm:text-sm font-medium bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('liquidity.remove')} {t('liquidity.removeLiquidity')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
