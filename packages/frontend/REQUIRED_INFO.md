# ChatOneSwap 前端项目 - 需要提供的信息清单

## 📋 概述

本文档列出了完成 ChatOneSwap 前端项目所需的所有信息和配置。请按照以下清单逐一提供。

---

## 🔴 必需信息（必须提供）

### 1. 环境变量配置 (.env 文件)

需要在项目根目录创建 `.env` 文件，包含以下变量：

```env
# WalletConnect 项目 ID（必需）
# 获取方式：访问 https://cloud.walletconnect.com 注册并创建项目
VITE_WALLET_CONNECT_PROJECT_ID=your-project-id-here

# 区块链网络 ID（必需）
# 可选值：56 (BSC主网) 或 97 (BSC测试网)
VITE_CHAIN_ID=97

# 可选配置
VITE_RPC_URL=https://bsc-testnet.publicnode.com
VITE_ENABLE_ANALYTICS=false
VITE_API_URL=
```

**获取 WalletConnect Project ID 步骤：**
1. 访问 https://cloud.walletconnect.com
2. 注册/登录账户
3. 创建新项目
4. 复制 Project ID

---

### 2. 合约部署地址

部署合约后，需要提供以下合约地址：

#### BSC 测试网 (Chain ID: 97)
- **VAULT** 地址：`0x...`
- **POOL_MANAGER** 地址：`0x...`
- **ROUTER** 地址：`0x...`

#### BSC 主网 (Chain ID: 56)
- **VAULT** 地址：`0x...`
- **POOL_MANAGER** 地址：`0x...`
- **ROUTER** 地址：`0x...`

**如何获取：**
- 运行部署脚本后，地址会保存在 `packages/contracts/deployments/{network}.json`
- 或从部署日志中复制

**更新位置：** `src/config/contracts.ts`

---

### 3. 合约 ABI

需要从编译后的合约文件中提取 ABI：

**ABI 文件位置：**
- Vault: `packages/contracts/artifacts/contracts/core/ChatOneSwapVault.sol/ChatOneSwapVault.json`
- PoolManager: `packages/contracts/artifacts/contracts/core/ChatOneSwapPoolManager.sol/ChatOneSwapPoolManager.json`
- Router: `packages/contracts/artifacts/contracts/periphery/ChatOneSwapRouter.sol/ChatOneSwapRouter.json`

**更新位置：** `src/config/contracts.ts`

**需要提取的 ABI：**
- `VAULT_ABI` - 从 ChatOneSwapVault.json 的 `abi` 字段
- `POOL_MANAGER_ABI` - 从 ChatOneSwapPoolManager.json 的 `abi` 字段
- `ROUTER_ABI` - 从 ChatOneSwapRouter.json 的 `abi` 字段

---

## 🟡 可选但建议提供的信息

### 4. 代币列表配置

当前代币列表是硬编码的，建议配置为可扩展的：

**当前配置位置：**
- `src/views/Swap.tsx` (第 9-13 行)
- `src/views/Liquidity.tsx` (第 11-15 行)

**建议提供：**
- 常用代币列表（BNB, BUSD, USDT 等）
- 代币符号、地址、小数位数
- 代币图标 URL（可选）

**示例格式：**
```typescript
{
  symbol: 'BNB',
  address: '0x0000000000000000000000000000000000000000', // 原生币用零地址
  decimals: 18,
  logoURI?: 'https://...'
}
```

---

### 5. 合约函数接口信息

为了完善功能实现，需要确认以下合约函数：

#### Router 合约
- `swapExactTokensForTokens` - 确认参数顺序和类型
- `swapExactETHForTokens` - 如果支持 ETH 交换
- `swapExactTokensForETH` - 如果支持 ETH 交换

#### Vault 合约
- `addLiquidity` - 确认函数签名和参数
- `removeLiquidity` - 确认函数签名和参数
- `getReserves` - 获取池子储备量

#### PoolManager 合约
- `getPool` - 获取池子信息
- `getAllPools` - 获取所有池子列表（如果存在）
- `createPool` - 创建新池子（如果需要前端支持）

---

### 6. RPC 节点配置

**默认使用：** wagmi 的默认公共 RPC

**建议提供（可选）：**
- 自定义 RPC URL（更稳定、更快）
- 多个 RPC 节点（故障转移）

**配置位置：** `src/config/wagmi.ts` 或通过环境变量 `VITE_RPC_URL`

---

## 📝 待完成的功能

以下功能需要根据实际合约接口完善：

### 1. Swap 功能
- [x] 基础 UI 和验证
- [ ] 计算输出数量（需要查询池子储备）
- [ ] 滑点保护计算
- [ ] 交易历史显示

### 2. 流动性管理
- [x] 基础 UI 和验证
- [ ] 根据池子比例自动计算添加数量
- [ ] 显示用户流动性头寸
- [ ] LP 代币余额查询

### 3. 池子列表
- [x] 基础 UI
- [ ] 从合约获取池子列表
- [ ] 显示池子统计信息（TVL、24h 交易量等）
- [ ] 搜索和筛选功能

---

## 🔧 配置步骤

### 步骤 1：创建环境变量文件

```bash
cd packages/frontend
cp ENV.md .env
# 编辑 .env 文件，填入实际值
```

### 步骤 2：更新合约配置

1. 部署合约后，复制合约地址
2. 从编译后的 JSON 文件中提取 ABI
3. 更新 `src/config/contracts.ts`

### 步骤 3：验证配置

```bash
# 安装依赖
npm install

# 类型检查
npm run type-check

# 启动开发服务器
npm run dev
```

---

## 📞 需要帮助？

如果遇到以下问题，请提供相关信息：

1. **合约部署问题** - 提供部署日志和错误信息
2. **ABI 提取问题** - 提供合约 JSON 文件路径
3. **功能不工作** - 提供浏览器控制台错误信息
4. **网络连接问题** - 提供 RPC 节点信息和错误信息

---

## ✅ 检查清单

完成配置后，请确认：

- [ ] `.env` 文件已创建并配置
- [ ] WalletConnect Project ID 已设置
- [ ] Chain ID 已设置（97 或 56）
- [ ] 合约地址已更新到 `contracts.ts`
- [ ] 合约 ABI 已更新到 `contracts.ts`
- [ ] 项目可以正常启动（`npm run dev`）
- [ ] 钱包可以连接
- [ ] 可以读取链上数据

---

*最后更新：2025年*

