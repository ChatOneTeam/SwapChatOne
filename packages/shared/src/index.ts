// Shared types and utilities

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

export interface Pool {
  id: string
  token0: Token
  token1: Token
  fee: number
  liquidity: string
  volume24h: string
  tvl: string
}

export interface SwapQuote {
  amountIn: string
  amountOut: string
  priceImpact: string
  route: string[]
}

export const CHAIN_IDS = {
  BSC: 56,
  BSC_TESTNET: 97,
} as const

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS]

