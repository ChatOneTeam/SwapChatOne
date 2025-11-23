/**
 * Toast Hook
 * 
 * Hook for managing toast notifications
 * Separated from Toast component to follow react-refresh rules
 */

import { useState } from 'react'
import type { ToastType } from '@/components/Toast'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const showSuccess = (message: string) => showToast(message, 'success')
  const showError = (message: string) => showToast(message, 'error')
  const showWarning = (message: string) => showToast(message, 'warning')
  const showInfo = (message: string) => showToast(message, 'info')

  return {
    toasts,
    showToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}

