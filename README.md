# ChatOneSwap Monorepo

A decentralized exchange (DEX) on BNB Smart Chain (BSC) based on PancakeSwap Infinity architecture.

## 🏗️ Monorepo Structure

```
ChatOneSwap/
├── packages/
│   ├── contracts/      # Smart contracts (Hardhat)
│   ├── frontend/        # Frontend application (React + Vite)
│   └── shared/          # Shared types and utilities
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── package.json         # Root package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install all dependencies
pnpm install
```

### Development

#### Contracts

```bash
# Compile contracts
pnpm contracts:compile

# Run tests
pnpm contracts:test

# Deploy to testnet
pnpm contracts:deploy:testnet
```

#### Frontend

```bash
# Start development server
pnpm frontend:dev

# Build for production
pnpm frontend:build
```

#### All Packages

```bash
# Build all packages
pnpm build

# Run tests for all packages
pnpm test

# Lint all packages
pnpm lint
```

## 📦 Packages

### `@chatoneswap/contracts`

Smart contracts for ChatOneSwap DEX.

**Key Contracts:**
- `ChatOneSwapVault` - Accounting layer
- `ChatOneSwapPoolManager` - AMM logic layer
- `ChatOneSwapRouter` - Swap router

### `@chatoneswap/frontend`

React-based frontend application for interacting with ChatOneSwap.

**Features:**
- Token swapping
- Liquidity management
- Pool management
- Wallet integration (WalletConnect, MetaMask)

### `@chatoneswap/shared`

Shared types and utilities used across packages.

## 🔧 Configuration

### Environment Variables

#### Contracts

Create `.env` in `packages/contracts/`:

```env
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
PRIVATE_KEY=your_private_key
BSCSCAN_API_KEY=your_bscscan_api_key
```

#### Frontend

Create `.env` in `packages/frontend/`:

```env
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
VITE_CONTRACT_VAULT=0x...
VITE_CONTRACT_POOL_MANAGER=0x...
VITE_CONTRACT_ROUTER=0x...
```

## 📝 Scripts

### Root Level

- `pnpm build` - Build all packages
- `pnpm test` - Run tests for all packages
- `pnpm lint` - Lint all packages
- `pnpm clean` - Clean all build artifacts

### Contract Specific

- `pnpm contracts:compile` - Compile contracts
- `pnpm contracts:test` - Run contract tests
- `pnpm contracts:deploy:testnet` - Deploy to BSC testnet
- `pnpm contracts:deploy:mainnet` - Deploy to BSC mainnet

### Frontend Specific

- `pnpm frontend:dev` - Start dev server
- `pnpm frontend:build` - Build for production
- `pnpm frontend:start` - Preview production build

## 🏗️ Architecture

ChatOneSwap is built on PancakeSwap Infinity's three-layer modular architecture:

```
┌─────────────────────────────────────┐
│   Custom Layer - Hooks              │  ← Custom functionality
└─────────────────────────────────────┘
           ↕
┌─────────────────────────────────────┐
│   AMM Layer - Pool Manager          │  ← AMM logic
└─────────────────────────────────────┘
           ↕
┌─────────────────────────────────────┐
│   Accounting Layer - Vault         │  ← Asset management
└─────────────────────────────────────┘
```

## 🔒 Security

- ✅ Based on audited PancakeSwap Infinity code
- ✅ OpenZeppelin security libraries
- ⚠️ **Security audit recommended before mainnet deployment**

## 📚 Documentation

- [Implementation Plan](./ChatOneSwap实现方案.md)
- [PancakeSwap Analysis](./PancakeSwap代码库分析文档.md)
- [Project Status](./PROJECT_STATUS.md)

## 📄 License

GPL-3.0

## 🙏 Acknowledgments

This project is based on [PancakeSwap Infinity](https://github.com/pancakeswap/infinity-core), which is licensed under GPL-3.0.
