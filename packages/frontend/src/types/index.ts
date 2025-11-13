/**
 * Type definitions for ChatOneSwap Frontend
 */

export interface Token {
  symbol: string
  address: string
  decimals: number
  name?: string
  logoURI?: string
}

export interface Pool {
  tokenA: string
  tokenB: string
  reserveA: string
  reserveB: string
  totalLiquidity: string
  fee: string
  poolAddress?: string
}

export interface SwapParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOutMin: string
  to: string
  deadline: number
}

export interface AddLiquidityParams {
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  to: string
  deadline: number
}

export interface RemoveLiquidityParams {
  tokenA: string
  tokenB: string
  liquidity: string
  amountAMin: string
  amountBMin: string
  to: string
  deadline: number
}

export interface TransactionStatus {
  hash: string | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  value?: string
}

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

export interface SecurityConfig {
  enableCSRF: boolean
  enableRateLimit: boolean
  rateLimitConfig?: RateLimitConfig
}

