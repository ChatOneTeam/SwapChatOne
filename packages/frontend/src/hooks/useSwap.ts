import { useState, useCallback, useMemo, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { validateTokenAmount, isValidAddress } from '@/utils/security'
import { ValidationError, logError } from '@/utils/errors'
// NetworkError reserved for future use
import { CONTRACTS, ROUTER_ABI } from '@/config/contracts'
import { useChainId } from 'wagmi'

interface SwapParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOutMin: string
  to: string
  deadline: number
}

export function useSwap() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Get router address for current chain
  const routerAddress = useMemo(() => {
    return CONTRACTS[chainId as keyof typeof CONTRACTS]?.ROUTER || ''
  }, [chainId])

  const validateSwapInput = useCallback(
    (params: Partial<SwapParams>): { isValid: boolean; error?: string } => {
      if (!isConnected || !address) {
        return { isValid: false, error: 'Please connect your wallet' }
      }

      if (!params.tokenIn || !params.tokenOut) {
        return { isValid: false, error: 'Please select both tokens' }
      }

      if (params.tokenIn === params.tokenOut) {
        return { isValid: false, error: 'Tokens must be different' }
      }

      if (!params.amountIn || params.amountIn === '0') {
        return { isValid: false, error: 'Please enter an amount' }
      }

      const amountValidation = validateTokenAmount(params.amountIn || '')
      if (!amountValidation.isValid) {
        return { isValid: false, error: amountValidation.error }
      }

      if (!params.to || !isValidAddress(params.to)) {
        return { isValid: false, error: 'Invalid recipient address' }
      }

      if (!routerAddress || routerAddress === '0x0000000000000000000000000000000000000000') {
        return { isValid: false, error: 'Router contract not configured' }
      }

      return { isValid: true }
    },
    [isConnected, address, routerAddress]
  )

  const swap = useCallback(
    async (params: SwapParams) => {
      try {
        setError(null)
        setIsLoading(true)

        // Validate input
        const validation = validateSwapInput(params)
        if (!validation.isValid) {
          throw new ValidationError(validation.error || 'Invalid swap parameters')
        }

        // Calculate deadline (20 minutes from now)
        const deadline = params.deadline || Math.floor(Date.now() / 1000) + 1200

        // Execute swap
        writeContract({
          address: routerAddress as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            BigInt(params.amountIn),
            BigInt(params.amountOutMin || '0'),
            [params.tokenIn as `0x${string}`, params.tokenOut as `0x${string}`],
            params.to as `0x${string}`,
            BigInt(deadline),
          ],
        })

        setTxHash(hash || null)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Swap failed. Please try again.'
        setError(errorMessage)
        logError(err instanceof Error ? err : new Error(errorMessage), {
          swapParams: params,
        })
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [validateSwapInput, routerAddress, writeContract, hash]
  )

  // Update error state when write error occurs
  useEffect(() => {
    if (writeError) {
      setError(writeError.message)
      logError(writeError, { context: 'swap_write_contract' })
    }
  }, [writeError])

  return {
    swap,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    txHash: hash || txHash,
    validateSwapInput,
  }
}

