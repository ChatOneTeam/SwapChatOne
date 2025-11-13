# AppKit 迁移指南

## 📋 概述

本项目已从 `@web3modal/wagmi` 迁移到 `@reown/appkit`。AppKit 是 WalletConnect 的新一代 SDK，提供了更好的开发体验和功能支持。

## 🔄 主要变更

### 1. 依赖更新

**旧依赖：**
```json
"@web3modal/wagmi": "^4.0.0"
```

**新依赖：**
```json
"@reown/appkit": "^1.0.0",
"@reown/appkit-adapter-wagmi": "^1.0.0"
```

### 2. 配置文件变更

**旧配置：** `src/config/wagmi.ts` (已删除)
**新配置：** `src/config/appkit.ts`

### 3. 组件变更

#### App.tsx
- **旧：** 使用 `WagmiProvider` + `createWeb3Modal`
- **新：** 使用 `AppKitProvider`（封装了所有配置）

#### Layout.tsx
- **旧：** 使用 `useWeb3Modal` hook
- **新：** 使用 `<WalletConnect />` 组件或 `<appkit-button />` web component

## 📦 新增组件

### 1. AppKitProvider (`src/components/AppKitProvider.tsx`)

封装的 Provider 组件，包含：
- WagmiProvider
- QueryClientProvider
- AppKit 初始化

**使用方式：**
```tsx
import { AppKitProvider } from './components/AppKitProvider'

function App() {
  return (
    <AppKitProvider>
      {/* 你的应用 */}
    </AppKitProvider>
  )
}
```

### 2. WalletConnect (`src/components/WalletConnect.tsx`)

封装的连接钱包组件，支持自定义样式和配置。

**使用方式：**
```tsx
import WalletConnect from './components/WalletConnect'

// 基础用法
<WalletConnect />

// 自定义配置
<WalletConnect 
  connectLabel="连接钱包"
  disconnectLabel="断开连接"
  showAddress={true}
  addressFormat="short"
/>
```

**Props：**
- `connectLabel`: 连接按钮文本（默认: "Connect Wallet"）
- `disconnectLabel`: 断开按钮文本（默认: "Disconnect"）
- `showAddress`: 是否显示地址（默认: true）
- `addressFormat`: 地址格式 'short' | 'full'（默认: 'short'）
- `connectClassName`: 连接按钮样式类名
- `disconnectClassName`: 断开按钮样式类名
- `addressClassName`: 地址显示样式类名
- `containerClassName`: 容器样式类名

### 3. AppKit 配置 (`src/config/appkit.ts`)

可移植的配置文件，包含：
- 网络配置
- 元数据配置
- AppKit 初始化函数

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

确保 `.env` 文件中包含：
```env
VITE_WALLET_CONNECT_PROJECT_ID=your-project-id
VITE_CHAIN_ID=97
```

### 3. 启动项目

```bash
npm run dev
```

## 🔧 移植到其他项目

### 步骤 1：复制文件

复制以下文件到新项目：
- `src/config/appkit.ts`
- `src/components/AppKitProvider.tsx`
- `src/components/WalletConnect.tsx`
- `src/vite-env.d.ts` (类型声明)

### 步骤 2：安装依赖

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
```

### 步骤 3：配置环境变量

创建 `.env` 文件：
```env
VITE_WALLET_CONNECT_PROJECT_ID=your-project-id
VITE_CHAIN_ID=your-chain-id
```

### 步骤 4：修改配置

编辑 `src/config/appkit.ts`：
- 更新 `supportedNetworks`（根据你的链）
- 更新 `appMetadata`（应用信息）

### 步骤 5：使用组件

```tsx
import { AppKitProvider } from './components/AppKitProvider'
import WalletConnect from './components/WalletConnect'

function App() {
  return (
    <AppKitProvider>
      <div>
        <WalletConnect />
        {/* 你的应用内容 */}
      </div>
    </AppKitProvider>
  )
}
```

## 📚 参考文档

- [AppKit 官方文档](https://docs.reown.com/appkit/react/core/installation)
- [AppKit React Wagmi 示例](https://github.com/reown-com/appkit-web-examples/tree/main/react/react-wagmi)
- [Wagmi 文档](https://wagmi.sh)

## ⚠️ 注意事项

1. **环境变量：** 确保 `VITE_WALLET_CONNECT_PROJECT_ID` 已正确设置
2. **网络配置：** 根据你的需求修改 `supportedNetworks`
3. **元数据：** 更新 `appMetadata` 中的 URL 和图标
4. **SSR：** AppKit 支持 SSR，但初始化必须在客户端进行

## 🐛 常见问题

### Q: 初始化失败怎么办？
A: 检查环境变量 `VITE_WALLET_CONNECT_PROJECT_ID` 是否已设置，并确保值正确。

### Q: 如何自定义连接按钮样式？
A: 使用 `WalletConnect` 组件的 `connectClassName` 和 `disconnectClassName` props。

### Q: 如何添加更多网络？
A: 在 `src/config/appkit.ts` 中导入网络并添加到 `supportedNetworks` 数组。

### Q: 可以使用原生的 `<appkit-button />` 吗？
A: 可以！AppKit 提供了 web component，可以直接使用 `<appkit-button />`。

## ✅ 迁移检查清单

- [x] 更新 package.json 依赖
- [x] 创建 AppKit 配置文件
- [x] 创建 AppKitProvider 组件
- [x] 创建 WalletConnect 组件
- [x] 更新 App.tsx
- [x] 更新 Layout.tsx
- [x] 删除旧的 wagmi.ts 配置
- [x] 添加类型声明文件
- [ ] 测试钱包连接功能
- [ ] 测试断开连接功能
- [ ] 测试网络切换功能

---

*最后更新：2025年*

