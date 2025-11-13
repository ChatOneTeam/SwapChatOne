/**
 * NumberInput Component
 * 
 * 安全的数字输入框组件，专门用于代币数量输入
 * 特性：
 * - 只允许输入数字和小数点
 * - 防止多个小数点
 * - 支持最大小数位数限制
 * - 防止输入负数（可选）
 * - 移动端友好的交互
 */

import { useState, useRef, useEffect, useCallback } from 'react'

export interface NumberInputProps {
  /**
   * 当前值
   */
  value: string
  /**
   * 值变化回调
   */
  onChange: (value: string) => void
  /**
   * 占位符
   */
  placeholder?: string
  /**
   * 是否禁用
   */
  disabled?: boolean
  /**
   * 最大小数位数（默认 18）
   */
  maxDecimals?: number
  /**
   * 是否允许负数（默认 false）
   */
  allowNegative?: boolean
  /**
   * 最小值（可选）
   */
  min?: number
  /**
   * 最大值（可选）
   */
  max?: number
  /**
   * 自定义类名
   */
  className?: string
  /**
   * 错误状态
   */
  error?: boolean
  /**
   * 只读模式
   */
  readOnly?: boolean
  /**
   * 输入模式（移动端键盘类型）
   */
  inputMode?: 'decimal' | 'numeric'
  /**
   * 自动聚焦
   */
  autoFocus?: boolean
  /**
   * 标签
   */
  label?: string
  /**
   * 辅助文本
   */
  helperText?: string
}

/**
 * 验证并格式化数字输入
 */
function sanitizeNumberInput(
  value: string,
  maxDecimals: number = 18,
  allowNegative: boolean = false
): string {
  // 移除所有非数字、非小数点、非负号的字符
  let sanitized = value.replace(/[^\d.-]/g, '')

  // 如果不允许负数，移除负号
  if (!allowNegative) {
    sanitized = sanitized.replace(/-/g, '')
  }

  // 处理多个小数点：只保留第一个
  const parts = sanitized.split('.')
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('')
  }

  // 限制小数位数
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    sanitized = parts[0] + '.' + parts[1].slice(0, maxDecimals)
  }

  // 处理负号位置：只能在开头
  if (allowNegative && sanitized.includes('-')) {
    const negativeIndex = sanitized.indexOf('-')
    if (negativeIndex > 0) {
      sanitized = '-' + sanitized.replace(/-/g, '')
    }
    // 确保只有一个负号
    if ((sanitized.match(/-/g) || []).length > 1) {
      sanitized = '-' + sanitized.replace(/-/g, '')
    }
  }

  return sanitized
}

/**
 * 安全的数字输入框组件
 */
export default function NumberInput({
  value,
  onChange,
  placeholder = '0.0',
  disabled = false,
  maxDecimals = 18,
  allowNegative = false,
  min,
  max,
  className = '',
  error = false,
  readOnly = false,
  inputMode = 'decimal',
  autoFocus = false,
  label,
  helperText,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // 同步外部值变化
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // 处理输入变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      // 允许空值
      if (inputValue === '' || inputValue === '.') {
        setLocalValue(inputValue)
        onChange(inputValue)
        return
      }

      // 清理和验证输入
      const sanitized = sanitizeNumberInput(inputValue, maxDecimals, allowNegative)

      // 转换为数字进行范围检查
      const numValue = parseFloat(sanitized)
      if (!isNaN(numValue)) {
        // 检查最小值
        if (min !== undefined && numValue < min) {
          return
        }
        // 检查最大值
        if (max !== undefined && numValue > max) {
          return
        }
      }

      setLocalValue(sanitized)
      onChange(sanitized)
    },
    [onChange, maxDecimals, allowNegative, min, max]
  )

  // 处理粘贴
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pastedText = e.clipboardData.getData('text')
      const sanitized = sanitizeNumberInput(pastedText, maxDecimals, allowNegative)
      
      const numValue = parseFloat(sanitized)
      if (!isNaN(numValue)) {
        if (min !== undefined && numValue < min) {
          return
        }
        if (max !== undefined && numValue > max) {
          return
        }
      }

      setLocalValue(sanitized)
      onChange(sanitized)
    },
    [onChange, maxDecimals, allowNegative, min, max]
  )

  // 处理键盘事件（防止输入无效字符）
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // 允许：数字、小数点、负号（如果允许）、退格、删除、Tab、方向键
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ]

    if (allowedKeys.includes(e.key)) {
      return
    }

    // 允许数字
    if (/^\d$/.test(e.key)) {
      return
    }

    // 允许小数点（如果还没有）
    if (e.key === '.' && !localValue.includes('.')) {
      return
    }

    // 允许负号（如果允许且在开头）
    if (allowNegative && e.key === '-' && localValue === '') {
      return
    }

    // 阻止其他字符
    e.preventDefault()
  }, [localValue, allowNegative])

  const baseClassName = `
    w-full px-4 py-3 sm:py-2 text-base sm:text-sm border rounded-xl glass
    focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400
    touch-manipulation transition-all duration-200
    ${error ? 'border-red-300 bg-red-50/50' : 'border-white/30'}
    ${disabled || readOnly ? 'opacity-60 cursor-not-allowed' : ''}
    ${readOnly ? 'bg-white/30' : ''}
  `

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        value={localValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        className={baseClassName}
      />
      {helperText && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  )
}

