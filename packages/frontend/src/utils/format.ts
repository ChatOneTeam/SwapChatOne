/**
 * Formatting utility functions
 */

/**
 * Formats a number with commas and fixed decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '0.00'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Formats a large number with K, M, B suffixes
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatCompactNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '0'
  }

  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`
  }

  return num.toFixed(decimals)
}

/**
 * Formats an Ethereum address to show first 6 and last 4 characters
 * @param address - Ethereum address
 * @param startLength - Number of characters at start (default: 6)
 * @param endLength - Number of characters at end (default: 4)
 * @returns Formatted address
 */
export function formatAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address || address.length < startLength + endLength) {
    return address
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * Formats a token amount with proper decimals
 * @param amount - Token amount (as string or BigInt)
 * @param decimals - Token decimals (default: 18)
 * @param displayDecimals - Number of decimals to display (default: 6)
 * @returns Formatted string
 */
export function formatTokenAmount(
  amount: string | bigint,
  decimals: number = 18,
  displayDecimals: number = 6
): string {
  try {
    const amountStr = typeof amount === 'bigint' ? amount.toString() : amount
    const divisor = BigInt(10 ** decimals)
    const wholePart = BigInt(amountStr) / divisor
    const fractionalPart = BigInt(amountStr) % divisor

    if (fractionalPart === BigInt(0)) {
      return wholePart.toString()
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    const trimmedFractional = fractionalStr.slice(0, displayDecimals).replace(/0+$/, '')

    if (trimmedFractional === '') {
      return wholePart.toString()
    }

    return `${wholePart}.${trimmedFractional}`
  } catch {
    return '0'
  }
}

/**
 * Formats a percentage value
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '0.00%'
  }

  return `${num.toFixed(decimals)}%`
}

/**
 * Formats a date to relative time (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp

  if (diff < 60) {
    return 'just now'
  }
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  if (diff < 604800) {
    const days = Math.floor(diff / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  return new Date(timestamp * 1000).toLocaleDateString()
}

/**
 * Formats a transaction hash for display
 * @param hash - Transaction hash
 * @param startLength - Number of characters at start (default: 8)
 * @param endLength - Number of characters at end (default: 8)
 * @returns Formatted hash
 */
export function formatTxHash(
  hash: string,
  startLength: number = 8,
  endLength: number = 8
): string {
  if (!hash || hash.length < startLength + endLength) {
    return hash
  }
  return `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`
}

