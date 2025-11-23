/**
 * Security utility functions for input validation, XSS protection, and CSRF protection
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  const reg = /[&<>"'/]/gi
  return input.replace(reg, (match) => map[match.toLowerCase()] || match)
}

/**
 * Validates Ethereum address format
 * @param address - Ethereum address to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }
  // Ethereum address regex: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Validates and sanitizes token amount input
 * @param amount - Token amount string
 * @param decimals - Token decimals (default: 18)
 * @returns Object with isValid flag and sanitized value
 */
export function validateTokenAmount(
  amount: string,
  decimals: number = 18
): { isValid: boolean; value: string; error?: string } {
  if (!amount || amount.trim() === '') {
    return { isValid: false, value: '', error: 'Amount cannot be empty' }
  }

  // Remove any whitespace
  const trimmed = amount.trim()

  // Check for negative numbers first (before format check)
  if (trimmed.startsWith('-')) {
    return { isValid: false, value: trimmed, error: 'Amount cannot be negative' }
  }

  // Check for multiple decimal points (before format check to give specific error)
  if ((trimmed.match(/\./g) || []).length > 1) {
    return { isValid: false, value: trimmed, error: 'Invalid decimal format' }
  }

  // Check for valid number format (allows decimals, but not negative)
  if (!/^\d*\.?\d*$/.test(trimmed)) {
    return { isValid: false, value: trimmed, error: 'Invalid number format' }
  }

  // Check decimal precision
  const decimalPart = trimmed.split('.')[1]
  if (decimalPart && decimalPart.length > decimals) {
    return {
      isValid: false,
      value: trimmed,
      error: `Maximum ${decimals} decimal places allowed`,
    }
  }

  // Check for extremely large numbers (prevent overflow)
  const numValue = parseFloat(trimmed)
  if (numValue > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, value: trimmed, error: 'Amount too large' }
  }

  return { isValid: true, value: trimmed }
}

/**
 * Validates token symbol
 * @param symbol - Token symbol
 * @returns true if valid, false otherwise
 */
export function isValidTokenSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') {
    return false
  }
  // Token symbols are typically 2-10 uppercase alphanumeric characters
  return /^[A-Z0-9]{2,10}$/.test(symbol)
}

/**
 * Generates CSRF token
 * @returns CSRF token string
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validates CSRF token
 * @param token - Token to validate
 * @param storedToken - Stored token to compare against
 * @returns true if valid, false otherwise
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) {
    return false
  }
  return token === storedToken && token.length === 64
}

/**
 * Rate limiting helper - checks if action is allowed
 * @param key - Unique key for the action
 * @param maxAttempts - Maximum attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxAttempts) {
    return false
  }

  record.count++
  return true
}

/**
 * Cleans up expired rate limit records
 */
export function cleanupRateLimit(): void {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup expired records every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000)
}

/**
 * Validates URL to prevent open redirect vulnerabilities
 * @param url - URL to validate
 * @param allowedDomains - Array of allowed domains
 * @returns true if valid, false otherwise
 */
export function isValidRedirectUrl(
  url: string,
  allowedDomains: string[] = []
): boolean {
  try {
    const urlObj = new URL(url)
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }
    // If allowedDomains is specified, check against it
    if (allowedDomains.length > 0) {
      return allowedDomains.some((domain) => urlObj.hostname === domain)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Escapes HTML special characters
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Validates transaction hash format
 * @param hash - Transaction hash
 * @returns true if valid, false otherwise
 */
export function isValidTxHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false
  }
  // Ethereum transaction hash: 0x followed by 64 hex characters
  return /^0x[a-fA-F0-9]{64}$/.test(hash)
}

