/**
 * Environment variable validation and type-safe access
 */

interface Env {
  VITE_CHAIN_ID: string
  VITE_RPC_URL?: string
  VITE_ENABLE_ANALYTICS?: string
  VITE_API_URL?: string
}

/**
 * Validates required environment variables
 * @throws Error if required env vars are missing
 */
function getEnvValue(key: keyof Env): string | undefined {
  // Use explicit property access instead of dynamic key access
  switch (key) {
    case 'VITE_CHAIN_ID':
      return import.meta.env.VITE_CHAIN_ID
    case 'VITE_RPC_URL':
      return import.meta.env.VITE_RPC_URL
    case 'VITE_ENABLE_ANALYTICS':
      return import.meta.env.VITE_ENABLE_ANALYTICS
    case 'VITE_API_URL':
      return import.meta.env.VITE_API_URL
    default:
      return undefined
  }
}

function validateEnv(): void {
  const required: (keyof Env)[] = ['VITE_CHAIN_ID']
  const missing: string[] = []

  for (const key of required) {
    if (!getEnvValue(key)) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  // Validate chain ID is a number
  const chainId = import.meta.env.VITE_CHAIN_ID
  if (chainId && isNaN(Number(chainId))) {
    throw new Error('VITE_CHAIN_ID must be a valid number')
  }
}

// Validate on module load
validateEnv()

/**
 * Type-safe environment variable accessor
 */
export const env: Env = {
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID || '56',
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS || 'false',
  VITE_API_URL: import.meta.env.VITE_API_URL,
}

/**
 * Check if running in development mode
 */
export const isDev = import.meta.env.DEV

/**
 * Check if running in production mode
 */
export const isProd = import.meta.env.PROD

/**
 * Get chain ID as number
 */
export const chainId = Number(env.VITE_CHAIN_ID)

/**
 * Check if analytics is enabled
 */
export const isAnalyticsEnabled = env.VITE_ENABLE_ANALYTICS === 'true'

