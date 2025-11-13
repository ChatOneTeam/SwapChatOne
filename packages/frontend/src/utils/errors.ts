/**
 * Error handling utilities
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class SecurityError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'SECURITY_ERROR', 403, details)
    this.name = 'SecurityError'
    Object.setPrototypeOf(this, SecurityError.prototype)
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', 0, details)
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * Error logger - in production, this would send to error tracking service
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error('Error:', error, 'Context:', context)
  } else {
    // In production, send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { extra: context })
  }
}

/**
 * Formats error message for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

