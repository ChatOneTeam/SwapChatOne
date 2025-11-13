import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import {
  checkRateLimit,
  generateCSRFToken,
  validateCSRFToken,
  isValidAddress,
} from '@/utils/security'
import { SecurityError } from '@/utils/errors'

/**
 * Hook for security-related functionality
 */
export function useSecurity() {
  const { address } = useAccount()
  const [csrfToken, setCsrfToken] = useState<string>('')

  // Generate CSRF token on mount
  useEffect(() => {
    const token = generateCSRFToken()
    setCsrfToken(token)
    // Store in sessionStorage for validation
    sessionStorage.setItem('csrf_token', token)
  }, [])

  /**
   * Validates CSRF token
   */
  const validateCSRF = useCallback(
    (token: string): boolean => {
      const storedToken = sessionStorage.getItem('csrf_token')
      if (!storedToken) {
        return false
      }
      return validateCSRFToken(token, storedToken)
    },
    []
  )

  /**
   * Checks if an action is rate limited
   */
  const checkActionRateLimit = useCallback(
    (action: string, maxAttempts: number = 5, windowMs: number = 60000): boolean => {
      const key = `${action}_${address || 'anonymous'}`
      return checkRateLimit(key, maxAttempts, windowMs)
    },
    [address]
  )

  /**
   * Validates wallet address
   */
  const validateWalletAddress = useCallback((addr: string): boolean => {
    return isValidAddress(addr)
  }, [])

  /**
   * Secure action wrapper - validates CSRF and rate limit before executing
   */
  const secureAction = useCallback(
    async <T,>(
      action: string,
      fn: () => Promise<T>,
      options?: {
        csrfToken?: string
        maxAttempts?: number
        windowMs?: number
      }
    ): Promise<T> => {
      // Check rate limit
      if (!checkActionRateLimit(action, options?.maxAttempts, options?.windowMs)) {
        throw new SecurityError(
          'Too many requests. Please wait before trying again.'
        )
      }

      // Validate CSRF if token provided
      if (options?.csrfToken && !validateCSRF(options.csrfToken)) {
        throw new SecurityError('Invalid security token')
      }

      return fn()
    },
    [checkActionRateLimit, validateCSRF]
  )

  return {
    csrfToken,
    validateCSRF,
    checkActionRateLimit,
    validateWalletAddress,
    secureAction,
  }
}

