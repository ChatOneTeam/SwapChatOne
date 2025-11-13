import { useState, useCallback, useMemo, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { validateTokenAmount, isValidAddress } from '@/utils/security'
import { ValidationError, logError } from '@/utils/errors'
import { CONTRACTS, VAULT_ABI } from '@/config/contracts'
import { useChainId } from 'wagmi'

interface AddLiquidityParams {
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  to: string
  deadline: number
}

interface RemoveLiquidityParams {
  tokenA: string
  tokenB: string
  liquidity: string
  amountAMin: string
  amountBMin: string
  to: string
  deadline: number
}

export function useLiquidity() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Get vault address for current chain
  const vaultAddress = useMemo(() => {
    return CONTRACTS[chainId as keyof typeof CONTRACTS]?.VAULT || ''
  }, [chainId])

  const validateAddLiquidityInput = useCallback(
    (params: Partial<AddLiquidityParams>): { isValid: boolean; error?: string } => {
      if (!isConnected || !address) {
        return { isValid: false, error: 'Please connect your wallet' }
      }

      if (!params.tokenA || !params.tokenB) {
        return { isValid: false, error: 'Please select both tokens' }
      }

      if (params.tokenA === params.tokenB) {
        return { isValid: false, error: 'Tokens must be different' }
      }

      if (!params.amountA || params.amountA === '0') {
        return { isValid: false, error: 'Please enter amount for token A' }
      }

      if (!params.amountB || params.amountB === '0') {
        return { isValid: false, error: 'Please enter amount for token B' }
      }

      const amountAValidation = validateTokenAmount(params.amountA || '')
      if (!amountAValidation.isValid) {
        return { isValid: false, error: `Token A: ${amountAValidation.error}` }
      }

      const amountBValidation = validateTokenAmount(params.amountB || '')
      if (!amountBValidation.isValid) {
        return { isValid: false, error: `Token B: ${amountBValidation.error}` }
      }

      if (!params.to || !isValidAddress(params.to)) {
        return { isValid: false, error: 'Invalid recipient address' }
      }

      if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
        return { isValid: false, error: 'Vault contract not configured' }
      }

      return { isValid: true }
    },
    [isConnected, address, vaultAddress]
  )

  const validateRemoveLiquidityInput = useCallback(
    (params: Partial<RemoveLiquidityParams>): { isValid: boolean; error?: string } => {
      if (!isConnected || !address) {
        return { isValid: false, error: 'Please connect your wallet' }
      }

      if (!params.tokenA || !params.tokenB) {
        return { isValid: false, error: 'Please select both tokens' }
      }

      if (!params.liquidity || params.liquidity === '0') {
        return { isValid: false, error: 'Please enter liquidity amount' }
      }

      const liquidityValidation = validateTokenAmount(params.liquidity || '')
      if (!liquidityValidation.isValid) {
        return { isValid: false, error: liquidityValidation.error }
      }

      if (!params.to || !isValidAddress(params.to)) {
        return { isValid: false, error: 'Invalid recipient address' }
      }

      if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
        return { isValid: false, error: 'Vault contract not configured' }
      }

      return { isValid: true }
    },
    [isConnected, address, vaultAddress]
  )

  const addLiquidity = useCallback(
    async (params: AddLiquidityParams) => {
      try {
        setError(null)
        setIsLoading(true)

        const validation = validateAddLiquidityInput(params)
        if (!validation.isValid) {
          throw new ValidationError(validation.error || 'Invalid liquidity parameters')
        }

        const deadline = params.deadline || Math.floor(Date.now() / 1000) + 1200

        // TODO: Implement actual addLiquidity call based on contract ABI
        writeContract({
          address: vaultAddress as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'addLiquidity',
          args: [
            params.tokenA as `0x${string}`,
            params.tokenB as `0x${string}`,
            BigInt(params.amountA),
            BigInt(params.amountB),
            params.to as `0x${string}`,
            BigInt(deadline),
          ],
        })

        setTxHash(hash || null)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Add liquidity failed. Please try again.'
        setError(errorMessage)
        logError(err instanceof Error ? err : new Error(errorMessage), {
          liquidityParams: params,
        })
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [validateAddLiquidityInput, vaultAddress, writeContract, hash]
  )

  const removeLiquidity = useCallback(
    async (params: RemoveLiquidityParams) => {
      try {
        setError(null)
        setIsLoading(true)

        const validation = validateRemoveLiquidityInput(params)
        if (!validation.isValid) {
          throw new ValidationError(validation.error || 'Invalid remove liquidity parameters')
        }

        const deadline = params.deadline || Math.floor(Date.now() / 1000) + 1200

        // TODO: Implement actual removeLiquidity call based on contract ABI
        writeContract({
          address: vaultAddress as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'removeLiquidity',
          args: [
            params.tokenA as `0x${string}`,
            params.tokenB as `0x${string}`,
            BigInt(params.liquidity),
            BigInt(params.amountAMin || '0'),
            BigInt(params.amountBMin || '0'),
            params.to as `0x${string}`,
            BigInt(deadline),
          ],
        })

        setTxHash(hash || null)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Remove liquidity failed. Please try again.'
        setError(errorMessage)
        logError(err instanceof Error ? err : new Error(errorMessage), {
          removeLiquidityParams: params,
        })
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [validateRemoveLiquidityInput, vaultAddress, writeContract, hash]
  )

  // Update error state when write error occurs
  useEffect(() => {
    if (writeError) {
      setError(writeError.message)
      logError(writeError, { context: 'liquidity_write_contract' })
    }
  }, [writeError])

  return {
    addLiquidity,
    removeLiquidity,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    txHash: hash || txHash,
    validateAddLiquidityInput,
    validateRemoveLiquidityInput,
  }
}

