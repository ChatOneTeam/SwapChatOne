/**
 * TokenSelect Component
 * 
 * 使用 Headless UI Listbox 实现的代币选择器组件
 * 支持搜索、移动端友好、样式美观
 */

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid'

export interface Token {
  symbol: string
  address: string
  decimals?: number
  logoURI?: string
}

interface TokenSelectProps {
  /**
   * 代币列表
   */
  tokens: Token[]
  /**
   * 当前选中的代币符号
   */
  value: string
  /**
   * 选择变化回调
   */
  onChange: (value: string) => void
  /**
   * 占位符文本
   */
  placeholder?: string
  /**
   * 是否禁用
   */
  disabled?: boolean
  /**
   * 自定义容器类名
   */
  className?: string
  /**
   * 是否显示搜索（暂未实现，可扩展）
   */
  // showSearch?: boolean // Reserved for future use
}

/**
 * 格式化地址显示
 */
function formatAddress(address: string): string {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return 'Native'
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * 代币选择器组件
 */
export default function TokenSelect({
  tokens,
  value,
  onChange,
  placeholder = 'Select token',
  disabled = false,
  className = '',
}: TokenSelectProps) {
  const selectedToken = tokens.find((token) => token.symbol === value)

  return (
    <div className={`relative ${className}`}>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        {({ open }) => (
          <>
            <Listbox.Button
              className={`
                relative w-full cursor-pointer rounded-xl border border-white/30 glass py-3 pl-3 pr-10 text-left text-base sm:text-sm shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 touch-manipulation transition-all duration-200
                ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary-300 hover:shadow-glow'}
                ${open ? 'border-primary-400 ring-2 ring-primary-400/50 shadow-glow' : ''}
              `}
            >
              <span className="block truncate">
                {selectedToken ? (
                  <span className="flex items-center">
                    {selectedToken.logoURI && (
                      <img
                        src={selectedToken.logoURI}
                        alt={selectedToken.symbol}
                        className="mr-2 h-5 w-5 rounded-full"
                      />
                    )}
                    <span className="font-medium">{selectedToken.symbol}</span>
                  </span>
                ) : (
                  <span className="text-gray-500">{placeholder}</span>
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl glass-dark py-2 text-base shadow-glow-lg ring-1 ring-white/20 focus:outline-none sm:text-sm backdrop-blur-xl"
              >
                {tokens.map((token) => (
                  <Listbox.Option
                    key={token.symbol}
            className={({ active: isActive }) =>
              `relative cursor-pointer select-none py-2.5 pl-3 pr-9 touch-manipulation transition-all duration-150 ${
                isActive ? 'bg-gradient-tech/10 text-primary-700' : 'text-slate-700'
              }`
            }
                    value={token.symbol}
                  >
                    {({ selected }) => (
                      <>
                        <div className="flex items-center">
                          {token.logoURI && (
                            <img
                              src={token.logoURI}
                              alt={token.symbol}
                              className="mr-2 h-5 w-5 rounded-full"
                            />
                          )}
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {token.symbol}
                          </span>
                          {token.address &&
                            token.address !==
                              '0x0000000000000000000000000000000000000000' && (
                              <span className="ml-2 text-xs text-gray-500">
                                {formatAddress(token.address)}
                              </span>
                            )}
                        </div>

                        {selected ? (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  )
}
