import { describe, it, expect, beforeEach } from 'vitest'
import {
  sanitizeInput,
  isValidAddress,
  validateTokenAmount,
  isValidTokenSymbol,
  generateCSRFToken,
  validateCSRFToken,
  checkRateLimit,
  isValidRedirectUrl,
  escapeHtml,
  isValidTxHash,
} from '../security'

describe('security utilities', () => {
  describe('sanitizeInput', () => {
    it('should sanitize XSS attempts', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
      expect(sanitizeInput("'onclick='alert(1)")).toBe(
        '&#x27;onclick=&#x27;alert(1)'
      )
    })

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('')
      expect(sanitizeInput(undefined as unknown as string)).toBe('')
    })
  })

  describe('isValidAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(
        isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      ).toBe(true)
      expect(
        isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')
      ).toBe(true)
    })

    it('should reject invalid addresses', () => {
      expect(isValidAddress('0x123')).toBe(false)
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bE')).toBe(
        false
      )
      expect(isValidAddress('')).toBe(false)
      expect(isValidAddress('not-an-address')).toBe(false)
    })
  })

  describe('validateTokenAmount', () => {
    it('should validate correct amounts', () => {
      expect(validateTokenAmount('100')).toEqual({
        isValid: true,
        value: '100',
      })
      expect(validateTokenAmount('100.5')).toEqual({
        isValid: true,
        value: '100.5',
      })
      expect(validateTokenAmount('0.000000000000000001')).toEqual({
        isValid: true,
        value: '0.000000000000000001',
      })
    })

    it('should reject invalid amounts', () => {
      expect(validateTokenAmount('')).toEqual({
        isValid: false,
        value: '',
        error: 'Amount cannot be empty',
      })
      expect(validateTokenAmount('abc')).toEqual({
        isValid: false,
        value: 'abc',
        error: 'Invalid number format',
      })
      expect(validateTokenAmount('-100')).toEqual({
        isValid: false,
        value: '-100',
        error: 'Amount cannot be negative',
      })
      expect(validateTokenAmount('100.5.5')).toEqual({
        isValid: false,
        value: '100.5.5',
        error: 'Invalid decimal format',
      })
    })

    it('should enforce decimal precision', () => {
      const result = validateTokenAmount('100.1234567890123456789', 18)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Maximum 18 decimal places')
    })
  })

  describe('isValidTokenSymbol', () => {
    it('should validate correct token symbols', () => {
      expect(isValidTokenSymbol('BNB')).toBe(true)
      expect(isValidTokenSymbol('USDT')).toBe(true)
      expect(isValidTokenSymbol('WETH')).toBe(true)
    })

    it('should reject invalid symbols', () => {
      expect(isValidTokenSymbol('')).toBe(false)
      expect(isValidTokenSymbol('a')).toBe(false) // too short
      expect(isValidTokenSymbol('lowercase')).toBe(false) // lowercase
      expect(isValidTokenSymbol('TOOLONG12345')).toBe(false) // too long
    })
  })

  describe('CSRF token', () => {
    it('should generate valid CSRF tokens', () => {
      const token = generateCSRFToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should validate CSRF tokens', () => {
      const token = generateCSRFToken()
      expect(validateCSRFToken(token, token)).toBe(true)
      expect(validateCSRFToken(token, 'different-token')).toBe(false)
      expect(validateCSRFToken('', '')).toBe(false)
    })
  })

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit store
      ;(checkRateLimit as any).rateLimitStore?.clear()
    })

    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit('test-key', 5, 60000)).toBe(true)
      }
    })

    it('should block requests exceeding limit', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key-2', 5, 60000)
      }
      expect(checkRateLimit('test-key-2', 5, 60000)).toBe(false)
    })
  })

  describe('isValidRedirectUrl', () => {
    it('should validate safe URLs', () => {
      expect(isValidRedirectUrl('https://example.com')).toBe(true)
      expect(isValidRedirectUrl('http://example.com')).toBe(true)
    })

    it('should reject dangerous URLs', () => {
      expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false)
      expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(
        false
      )
    })

    it('should validate against allowed domains', () => {
      expect(
        isValidRedirectUrl('https://example.com', ['example.com'])
      ).toBe(true)
      expect(
        isValidRedirectUrl('https://evil.com', ['example.com'])
      ).toBe(false)
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      )
      expect(escapeHtml('Hello & World')).toBe('Hello &amp; World')
    })
  })

  describe('isValidTxHash', () => {
    it('should validate correct transaction hashes', () => {
      expect(
        isValidTxHash(
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        )
      ).toBe(true)
    })

    it('should reject invalid hashes', () => {
      expect(isValidTxHash('0x123')).toBe(false)
      expect(isValidTxHash('not-a-hash')).toBe(false)
      expect(isValidTxHash('')).toBe(false)
    })
  })
})

