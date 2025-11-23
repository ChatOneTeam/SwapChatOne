/**
 * WalletConnect Component
 * 
 * 封装的连接钱包组件，可以轻松移植到其他项目
 * 
 * 使用方式：
 * <WalletConnect />
 * 
 * 或者自定义样式：
 * <WalletConnect 
 *   connectLabel="连接钱包"
 *   disconnectLabel="断开连接"
 *   showAddress={true}
 *   addressFormat="short"
 * />
 */

import { useAccount, useDisconnect } from 'wagmi'

export interface WalletConnectProps {
  /**
   * 连接按钮的文本（未使用，因为使用 appkit-button）
   */
  connectLabel?: string
  /**
   * 断开连接按钮的文本
   */
  disconnectLabel?: string
  /**
   * 是否显示地址
   */
  showAddress?: boolean
  /**
   * 地址显示格式: 'short' | 'full'
   */
  addressFormat?: 'short' | 'full'
  /**
   * 自定义连接按钮样式类名（未使用，因为使用 appkit-button）
   */
  connectClassName?: string
  /**
   * 自定义断开按钮样式类名
   */
  disconnectClassName?: string
  /**
   * 自定义地址显示样式类名
   */
  addressClassName?: string
  /**
   * 自定义容器样式类名
   */
  containerClassName?: string
}

/**
 * 格式化地址显示
 */
function formatAddress(address: string, format: 'short' | 'full' = 'short'): string {
  if (format === 'full') {
    return address
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * 连接钱包组件
 * 
 * 这是一个封装的组件，使用 AppKit 的 web component <appkit-button>
 * 可以轻松移植到其他项目
 */
export function WalletConnect({
  disconnectLabel = 'Disconnect',
  showAddress = true,
  addressFormat = 'short',
  disconnectClassName = 'px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all duration-200 touch-manipulation',
  addressClassName = 'text-xs sm:text-sm text-gray-600 truncate max-w-[100px] sm:max-w-none',
  containerClassName = 'flex items-center space-x-2 sm:space-x-4',
}: WalletConnectProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  // 如果未连接，显示连接按钮（使用 AppKit 的 web component）
  if (!isConnected) {
    return (
      <div className={containerClassName}>
        {/* AppKit 的 web component，全局可用，无需导入 */}
        <appkit-button />
      </div>
    )
  }

  // 如果已连接，显示地址和断开按钮
  return (
    <div className={containerClassName}>
      {showAddress && address && (
        <span className={addressClassName} title={address}>
          {formatAddress(address, addressFormat)}
        </span>
      )}
      <button
        onClick={() => disconnect()}
        className={disconnectClassName}
        aria-label="断开钱包连接"
      >
        {disconnectLabel}
      </button>
    </div>
  )
}

/**
 * 简化版连接按钮组件
 * 只显示连接/断开按钮，不显示地址
 */
export function WalletConnectButton({
  disconnectLabel = 'Disconnect',
  className = 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors',
}: {
  disconnectLabel?: string
  className?: string
}) {
  const { isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (!isConnected) {
    return <appkit-button />
  }

  return (
    <button
      onClick={() => disconnect()}
      className={className.replace('bg-blue-600', 'bg-red-500').replace('hover:bg-blue-700', 'hover:bg-red-600')}
    >
      {disconnectLabel}
    </button>
  )
}

