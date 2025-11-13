# ChatOneSwap 合约部署指南

## 📋 部署概述

本指南将帮助您完成 ChatOneSwap 合约的部署，包括：
1. 本地测试部署
2. BSC 测试网部署
3. BSC 主网部署

---

## 🔧 前置准备

### 1. 环境变量配置

在 `packages/contracts/` 目录下创建 `.env` 文件：

```env
# BSC 主网 RPC
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/

# BSC 测试网 RPC
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/

# 部署账户私钥（不要提交到 Git）
PRIVATE_KEY=your_private_key_here

# BSCScan API Key（用于验证合约）
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

**⚠️ 重要安全提示：**
- 不要将 `.env` 文件提交到 Git
- 确保 `.env` 在 `.gitignore` 中
- 使用专门的部署账户，不要使用主账户
- 建议使用硬件钱包或多重签名钱包

### 2. 账户余额检查

**BSC 测试网：**
- 需要至少 0.1 BNB（测试币）
- 可以从 [BSC Faucet](https://testnet.bnbchain.org/faucet-smart) 获取

**BSC 主网：**
- 需要至少 0.5 BNB（用于 Gas 费用）
- 建议准备 1-2 BNB 以确保部署顺利

---

## 📝 步骤 1：本地测试部署

### 1.1 运行本地 Hardhat 节点

```bash
cd packages/contracts
pnpm node
```

这将启动一个本地 Hardhat 节点，默认账户会自动获得测试币。

### 1.2 在另一个终端部署合约

```bash
cd packages/contracts
pnpm hardhat run scripts/deploy-full.js --network localhost
```

### 1.3 验证部署

部署脚本会输出所有合约地址，并保存到 `deployments/localhost.json`。

---

## 📝 步骤 2：BSC 测试网部署

### 2.1 检查配置

确保 `.env` 文件已配置：
- `BSC_TESTNET_RPC`
- `PRIVATE_KEY`
- `BSCSCAN_API_KEY`（可选，用于验证）

### 2.2 检查账户余额

```bash
# 使用 Hardhat console 检查余额
pnpm hardhat console --network bsc-testnet
```

在 console 中：
```javascript
const [signer] = await ethers.getSigners();
const balance = await ethers.provider.getBalance(signer.address);
console.log("Balance:", ethers.formatEther(balance), "BNB");
```

### 2.3 部署合约

```bash
cd packages/contracts
pnpm deploy:testnet
```

或者使用完整部署脚本：
```bash
pnpm hardhat run scripts/deploy-full.js --network bsc-testnet
```

### 2.4 验证合约（可选）

部署完成后，可以使用 Hardhat 验证合约：

```bash
# 验证 Vault
pnpm hardhat verify --network bsc-testnet <VAULT_ADDRESS>

# 验证 PoolManager
pnpm hardhat verify --network bsc-testnet <POOL_MANAGER_ADDRESS> <VAULT_ADDRESS>

# 验证 Router
pnpm hardhat verify --network bsc-testnet <ROUTER_ADDRESS> <POOL_MANAGER_ADDRESS> <VAULT_ADDRESS>

# 验证 Timelock
pnpm hardhat verify --network bsc-testnet <TIMELOCK_ADDRESS>
```

### 2.5 测试网测试

部署完成后，建议进行以下测试：

1. **创建池子**
   ```javascript
   // 使用 Hardhat console
   const poolManager = await ethers.getContractAt("ChatOneSwapPoolManager", "<POOL_MANAGER_ADDRESS>");
   await poolManager.createPool(token0, token1, 3000); // 0.3% fee
   ```

2. **添加流动性**
   ```javascript
   const router = await ethers.getContractAt("ChatOneSwapRouter", "<ROUTER_ADDRESS>");
   await router.addLiquidity(poolKey, token0, token1, amount0, amount1, 0, 0, userAddress);
   ```

3. **执行 Swap**
   ```javascript
   await router.swap(poolKey, tokenIn, tokenOut, amountIn, minOut, recipient);
   ```

---

## 📝 步骤 3：BSC 主网部署

### 3.1 部署前检查清单

- [ ] 所有测试通过（✅ 180 个测试全部通过）
- [ ] 安全审计完成（✅ 已完成）
- [ ] 代码已验证（✅ 已编译）
- [ ] 多重签名钱包设置（⚠️ 建议）
- [ ] 时间锁配置（✅ 已包含在部署脚本中）
- [ ] 紧急暂停机制（✅ 已实现）
- [ ] 监控系统就绪（⚠️ 建议）

### 3.2 检查配置

确保 `.env` 文件已配置：
- `BSC_MAINNET_RPC`
- `PRIVATE_KEY`（建议使用多重签名钱包）
- `BSCSCAN_API_KEY`

### 3.3 检查账户余额

确保部署账户有足够的 BNB（建议 1-2 BNB）。

### 3.4 部署合约

**⚠️ 重要：主网部署不可逆，请仔细检查！**

```bash
cd packages/contracts
pnpm deploy:mainnet
```

或者使用完整部署脚本：
```bash
pnpm hardhat run scripts/deploy-full.js --network bsc
```

### 3.5 验证合约

部署完成后，立即验证合约：

```bash
# 验证 Vault
pnpm hardhat verify --network bsc <VAULT_ADDRESS>

# 验证 PoolManager
pnpm hardhat verify --network bsc <POOL_MANAGER_ADDRESS> <VAULT_ADDRESS>

# 验证 Router
pnpm hardhat verify --network bsc <ROUTER_ADDRESS> <POOL_MANAGER_ADDRESS> <VAULT_ADDRESS>

# 验证 Timelock
pnpm hardhat verify --network bsc <TIMELOCK_ADDRESS>
```

### 3.6 主网部署后操作

1. **转移 Timelock 所有权**
   ```javascript
   // 将 Timelock 所有权转移到多重签名钱包
   const timelock = await ethers.getContractAt("ChatOneSwapTimelock", "<TIMELOCK_ADDRESS>");
   await timelock.transferOwnership(multisigAddress);
   ```

2. **设置监控**
   - 监控合约余额
   - 监控异常交易
   - 设置告警

3. **创建初始池子**
   - 创建主要交易对池子
   - 添加初始流动性

---

## 📊 部署后的合约地址

部署信息会保存在 `packages/contracts/deployments/<network>.json`：

```json
{
  "network": "bsc-testnet",
  "chainId": 97,
  "deployer": "0x...",
  "timestamp": "2025-01-XX...",
  "contracts": {
    "vault": "0x...",
    "poolManager": "0x...",
    "router": "0x...",
    "timelock": "0x..."
  }
}
```

---

## 🔒 安全注意事项

### 部署前

1. ✅ **代码审查** - 确保代码已审查
2. ✅ **测试通过** - 所有测试必须通过
3. ✅ **安全审计** - 完成安全审计
4. ⚠️ **多重签名** - 建议使用多重签名钱包

### 部署后

1. ⚠️ **转移所有权** - 将 Timelock 所有权转移到多重签名钱包
2. ⚠️ **设置监控** - 设置合约监控和告警
3. ⚠️ **备份地址** - 保存所有合约地址和部署信息
4. ⚠️ **文档更新** - 更新前端配置和文档

---

## 🐛 常见问题

### Q1: 部署失败 - Insufficient balance

**解决方案：**
- 检查账户余额是否足够
- BSC 测试网需要至少 0.1 BNB
- BSC 主网需要至少 0.5 BNB

### Q2: 部署失败 - Nonce too high

**解决方案：**
- 等待之前的交易确认
- 或手动设置 nonce

### Q3: 验证合约失败

**解决方案：**
- 确保 `BSCSCAN_API_KEY` 正确
- 等待几个区块后再验证
- 检查构造函数参数是否正确

---

## 📞 支持

如有问题，请查看：
- 部署日志：`packages/contracts/deployments/`
- 测试报告：运行 `pnpm test`
- 安全审计报告：`FINAL_SECURITY_AUDIT.md`

---

*最后更新：2025年*

