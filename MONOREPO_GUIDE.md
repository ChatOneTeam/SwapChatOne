# ChatOneSwap Monorepo 指南

## 📁 项目结构

```
ChatOneSwap/
├── packages/
│   ├── contracts/          # 智能合约层
│   │   ├── contracts/      # Solidity 合约
│   │   ├── test/           # 测试文件
│   │   ├── scripts/        # 部署脚本
│   │   └── hardhat.config.js
│   │
│   ├── frontend/           # 前端应用层
│   │   ├── src/
│   │   │   ├── components/ # React 组件
│   │   │   ├── views/      # 页面视图
│   │   │   ├── hooks/      # React Hooks
│   │   │   ├── config/     # 配置文件
│   │   │   └── utils/      # 工具函数
│   │   ├── public/         # 静态资源
│   │   └── vite.config.ts
│   │
│   └── shared/             # 共享代码
│       └── src/            # 共享类型和工具
│
├── pnpm-workspace.yaml     # pnpm workspace 配置
└── package.json            # 根 package.json
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 在项目根目录执行
pnpm install
```

这会安装所有 packages 的依赖。

### 2. 开发合约

```bash
# 编译合约
pnpm contracts:compile

# 运行测试
pnpm contracts:test

# 部署到测试网
pnpm contracts:deploy:testnet
```

### 3. 开发前端

```bash
# 启动开发服务器
pnpm frontend:dev

# 构建生产版本
pnpm frontend:build
```

## 📦 包说明

### `@chatoneswap/contracts`

智能合约包，包含所有 Solidity 合约。

**目录结构:**
- `contracts/core/` - 核心合约（Vault, PoolManager）
- `contracts/periphery/` - 外围合约（Router）
- `contracts/hooks/` - Hooks 合约（待开发）
- `test/` - 测试文件
- `scripts/` - 部署脚本

**主要命令:**
```bash
cd packages/contracts
pnpm compile    # 编译
pnpm test       # 测试
pnpm deploy     # 部署
```

### `@chatoneswap/frontend`

前端应用包，基于 React + Vite + TypeScript。

**技术栈:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Wagmi (Web3)
- WalletConnect

**目录结构:**
- `src/components/` - 可复用组件
- `src/views/` - 页面视图
- `src/hooks/` - 自定义 Hooks
- `src/config/` - 配置文件
- `src/utils/` - 工具函数

**主要命令:**
```bash
cd packages/frontend
pnpm dev        # 开发服务器
pnpm build      # 构建
pnpm preview    # 预览构建结果
```

### `@chatoneswap/shared`

共享代码包，包含类型定义和工具函数。

**用途:**
- 类型定义（Token, Pool, SwapQuote 等）
- 共享常量
- 工具函数

**使用方式:**
```typescript
// 在前端或合约测试中使用
import { Token, Pool } from '@chatoneswap/shared'
```

## 🔧 工作流

### 开发新功能

1. **合约开发**
   ```bash
   # 在 packages/contracts 中开发
   pnpm contracts:compile
   pnpm contracts:test
   ```

2. **前端集成**
   ```bash
   # 在 packages/frontend 中集成
   pnpm frontend:dev
   ```

3. **类型同步**
   ```bash
   # 在 packages/shared 中定义类型
   # 其他包会自动使用
   ```

### 构建和部署

```bash
# 构建所有包
pnpm build

# 只构建合约
pnpm contracts:compile

# 只构建前端
pnpm frontend:build
```

## 🔗 包之间的依赖

```
frontend
  ├── @chatoneswap/shared (类型定义)
  └── @chatoneswap/contracts (ABI, 地址)

contracts
  └── @chatoneswap/shared (类型定义，用于测试)
```

## 📝 环境变量

### 合约环境变量 (`packages/contracts/.env`)

```env
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
PRIVATE_KEY=your_private_key
BSCSCAN_API_KEY=your_bscscan_api_key
```

### 前端环境变量 (`packages/frontend/.env`)

```env
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
VITE_CONTRACT_VAULT=0x...
VITE_CONTRACT_POOL_MANAGER=0x...
VITE_CONTRACT_ROUTER=0x...
```

## 🎯 最佳实践

1. **类型安全**: 使用 `@chatoneswap/shared` 中的类型定义
2. **代码复用**: 将通用逻辑放在 `shared` 包中
3. **独立开发**: 每个包可以独立开发和测试
4. **统一构建**: 使用根目录的脚本统一管理构建

## 🐛 常见问题

### Q: 如何添加新的包？

A: 在 `packages/` 目录下创建新文件夹，添加 `package.json`，pnpm 会自动识别。

### Q: 如何更新依赖？

A: 在根目录执行 `pnpm update` 或在特定包中执行 `pnpm update <package>`。

### Q: 如何运行特定包的脚本？

A: 使用 `pnpm --filter <package-name> <script>` 或使用根目录的快捷脚本。

## 📚 更多信息

- [pnpm Workspaces 文档](https://pnpm.io/workspaces)
- [Monorepo 最佳实践](https://monorepo.tools/)

