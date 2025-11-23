# @chatoneswap/wallet

可复用的钱包连接包，基于 AppKit 和 Wagmi，可以在不同的项目中使用。

## 安装

```bash
pnpm add @chatoneswap/wallet
```

## 使用方法

### 1. 配置钱包

在你的项目中创建钱包配置文件（例如 `config/wallet.ts`）：

```typescript
import { bsc, bscTestnet } from '@reown/appkit/networks'
import type { WalletConfig } from '@chatoneswap/wallet'

export function getWalletConfig(): WalletConfig {
  return {
    projectId: process.env.defaultProjectId!, // 必需
    networks: [bsc, bscTestnet], // 支持的网络
    metadata: {
      name: 'Your App Name',
      description: 'Your App Description',
      url: 'https://yourapp.com',
      icons: ['https://yourapp.com/icon.png']
    },
    enableAnalytics: false, // 可选
    ssr: true, // 可选，默认 true
  }
}
```

### 2. 使用 AppKitProvider

在你的应用根组件中使用 `AppKitProvider`：

```typescript
import { AppKitProvider } from '@chatoneswap/wallet'
import { getWalletConfig } from './config/wallet'

function App() {
  const walletConfig = getWalletConfig()
  
  return (
    <AppKitProvider config={walletConfig}>
      {/* 你的应用内容 */}
    </AppKitProvider>
  )
}
```

### 3. 使用 WalletConnect 组件

```typescript
import { WalletConnect } from '@chatoneswap/wallet'

function Header() {
  return (
    <header>
      <WalletConnect 
        disconnectLabel="断开连接"
        showAddress={true}
        addressFormat="short"
      />
    </header>
  )
}
```

## API

### AppKitProvider

钱包连接的 Provider 组件。

**Props:**
- `config: WalletConfig` - 钱包配置（必需）
- `queryClient?: QueryClient` - 自定义 QueryClient（可选）
- `children: ReactNode` - 子组件（必需）

### WalletConnect

钱包连接按钮组件。

**Props:**
- `disconnectLabel?: string` - 断开连接按钮文本（默认: "Disconnect"）
- `showAddress?: boolean` - 是否显示地址（默认: true）
- `addressFormat?: 'short' | 'full'` - 地址格式（默认: "short"）
- `disconnectClassName?: string` - 断开按钮样式类名
- `addressClassName?: string` - 地址显示样式类名
- `containerClassName?: string` - 容器样式类名

### WalletConnectButton

简化版钱包连接按钮（不显示地址）。

**Props:**
- `disconnectLabel?: string` - 断开连接按钮文本
- `className?: string` - 按钮样式类名

## 导出

```typescript
// 主入口
import { AppKitProvider, WalletConnect } from '@chatoneswap/wallet'

// 或者使用子路径导入
import { AppKitProvider } from '@chatoneswap/wallet/provider'
import { WalletConnect } from '@chatoneswap/wallet/components'
import { setupAppKit } from '@chatoneswap/wallet/config'
```

## 依赖

这个包需要以下 peer dependencies：

- `@reown/appkit`: ^1.0.0
- `@reown/appkit-adapter-wagmi`: ^1.0.0
- `@tanstack/react-query`: ^5.17.0
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `wagmi`: ^2.5.0

## 示例

查看 `packages/frontend` 目录中的使用示例。

