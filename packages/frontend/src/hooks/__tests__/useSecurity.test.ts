import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSecurity } from '../useSecurity'

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    isConnected: true,
  }),
}))

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

describe('useSecurity', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
  })

  it('should generate CSRF token on mount', () => {
    const { result } = renderHook(() => useSecurity())
    expect(result.current.csrfToken).toBeTruthy()
    expect(result.current.csrfToken).toHaveLength(64)
  })

  it('should validate CSRF tokens', () => {
    const { result } = renderHook(() => useSecurity())
    const token = result.current.csrfToken
    expect(result.current.validateCSRF(token)).toBe(true)
    expect(result.current.validateCSRF('invalid-token')).toBe(false)
  })

  it('should check rate limits', () => {
    const { result } = renderHook(() => useSecurity())
    
    // First few attempts should pass
    expect(result.current.checkActionRateLimit('test-action', 5, 60000)).toBe(true)
    expect(result.current.checkActionRateLimit('test-action', 5, 60000)).toBe(true)
    
    // After exceeding limit, should fail
    for (let i = 0; i < 5; i++) {
      result.current.checkActionRateLimit('test-action-2', 5, 60000)
    }
    expect(result.current.checkActionRateLimit('test-action-2', 5, 60000)).toBe(false)
  })

  it('should validate wallet addresses', () => {
    const { result } = renderHook(() => useSecurity())
    expect(result.current.validateWalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(true)
    expect(result.current.validateWalletAddress('invalid')).toBe(false)
  })

  it('should execute secure actions', async () => {
    const { result } = renderHook(() => useSecurity())
    
    const mockAction = vi.fn().mockResolvedValue('success')
    
    await result.current.secureAction('test-action', mockAction)
    
    expect(mockAction).toHaveBeenCalled()
  })

  it('should reject secure actions when rate limited', async () => {
    const { result } = renderHook(() => useSecurity())
    
    // Exceed rate limit
    for (let i = 0; i < 6; i++) {
      result.current.checkActionRateLimit('test-action', 5, 60000)
    }
    
    const mockAction = vi.fn().mockResolvedValue('success')
    
    await expect(
      result.current.secureAction('test-action', mockAction, { maxAttempts: 5 })
    ).rejects.toThrow()
    
    expect(mockAction).not.toHaveBeenCalled()
  })
})

