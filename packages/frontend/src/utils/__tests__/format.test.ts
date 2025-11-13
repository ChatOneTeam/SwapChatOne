import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatCompactNumber,
  formatAddress,
  formatTokenAmount,
  formatPercentage,
  formatRelativeTime,
  formatTxHash,
} from '../format'

describe('format utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000.00')
      expect(formatNumber(1234567.89)).toBe('1,234,567.89')
    })

    it('should handle string inputs', () => {
      expect(formatNumber('1000')).toBe('1,000.00')
    })

    it('should handle custom decimal places', () => {
      expect(formatNumber(1000.123, 3)).toBe('1,000.123')
    })

    it('should handle invalid inputs', () => {
      expect(formatNumber('abc')).toBe('0.00')
      expect(formatNumber(NaN)).toBe('0.00')
    })
  })

  describe('formatCompactNumber', () => {
    it('should format large numbers with suffixes', () => {
      expect(formatCompactNumber(1000)).toBe('1.00K')
      expect(formatCompactNumber(1000000)).toBe('1.00M')
      expect(formatCompactNumber(1000000000)).toBe('1.00B')
    })

    it('should handle small numbers', () => {
      expect(formatCompactNumber(100)).toBe('100.00')
      expect(formatCompactNumber(50)).toBe('50.00')
    })
  })

  describe('formatAddress', () => {
    it('should format Ethereum addresses', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
      expect(formatAddress(address)).toBe('0x742d...bEb0')
    })

    it('should handle custom lengths', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
      expect(formatAddress(address, 4, 4)).toBe('0x74...bEb0')
    })

    it('should handle short addresses', () => {
      expect(formatAddress('0x123')).toBe('0x123')
    })
  })

  describe('formatTokenAmount', () => {
    it('should format token amounts with decimals', () => {
      expect(formatTokenAmount('1000000000000000000', 18)).toBe('1')
      expect(formatTokenAmount('1500000000000000000', 18)).toBe('1.5')
    })

    it('should handle BigInt inputs', () => {
      expect(formatTokenAmount(BigInt('1000000000000000000'), 18)).toBe('1')
    })

    it('should limit display decimals', () => {
      const amount = '1234567890000000000' // 1.23456789
      expect(formatTokenAmount(amount, 18, 2)).toBe('1.23')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage values', () => {
      expect(formatPercentage(50)).toBe('50.00%')
      expect(formatPercentage(12.5)).toBe('12.50%')
    })

    it('should handle custom decimal places', () => {
      expect(formatPercentage(12.345, 1)).toBe('12.3%')
    })
  })

  describe('formatRelativeTime', () => {
    it('should format recent times', () => {
      const now = Math.floor(Date.now() / 1000)
      expect(formatRelativeTime(now - 30)).toBe('just now')
      expect(formatRelativeTime(now - 120)).toContain('minute')
      expect(formatRelativeTime(now - 7200)).toContain('hour')
    })
  })

  describe('formatTxHash', () => {
    it('should format transaction hashes', () => {
      const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      expect(formatTxHash(hash)).toBe('0x123456...90abcdef')
    })
  })
})

