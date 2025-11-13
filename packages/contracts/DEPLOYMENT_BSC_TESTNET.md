# BSC Testnet 部署信息

## 📅 部署时间
2025-11-13 16:34:16 UTC

## 🌐 网络信息
- **网络**: BSC Testnet
- **Chain ID**: 97
- **部署账户**: 0xE1942186CB6Aef698298E53A0A5097930AED992D
- **账户余额**: 0.6264247608 BNB

## 📦 合约地址

### 核心合约
- **Vault**: `0x388a2E4d6792a33AF06D67bc67a881EF176F2BBb`
  - [BSCScan Testnet](https://testnet.bscscan.com/address/0x388a2E4d6792a33AF06D67bc67a881EF176F2BBb)
  
- **PoolManager**: `0x6AF869e70001CD6E85fE65aa1ab6D246774A76eC`
  - [BSCScan Testnet](https://testnet.bscscan.com/address/0x6AF869e70001CD6E85fE65aa1ab6D246774A76eC)
  
- **Router**: `0xb28D618E2E11FDD3B6A8926232c2d6bE3C0C6475`
  - [BSCScan Testnet](https://testnet.bscscan.com/address/0xb28D618E2E11FDD3B6A8926232c2d6bE3C0C6475)
  
- **Timelock**: `0x68f1753f67973F89e2dd67d45Ec7B06C03A1D64c`
  - [BSCScan Testnet](https://testnet.bscscan.com/address/0x68f1753f67973F89e2dd67d45Ec7B06C03A1D64c)

## ✅ 部署状态
- ✅ 所有合约部署成功
- ✅ 合约关系配置完成
- ✅ 交易确认完成（5个区块确认）
- ⚠️ 合约代码验证待完成（需要更新 BSCScan API 配置）

## 📋 验证命令

### 方式1：使用 Hardhat（需要更新 API 配置）
```bash
cd packages/contracts

# Vault（无构造函数参数）
npx hardhat verify --network bsc-testnet 0x388a2E4d6792a33AF06D67bc67a881EF176F2BBb

# PoolManager（需要 Vault 地址作为参数）
npx hardhat verify --network bsc-testnet 0x6AF869e70001CD6E85fE65aa1ab6D246774A76eC 0x388a2E4d6792a33AF06D67bc67a881EF176F2BBb

# Router（需要 PoolManager 和 Vault 地址作为参数）
npx hardhat verify --network bsc-testnet 0xb28D618E2E11FDD3B6A8926232c2d6bE3C0C6475 0x6AF869e70001CD6E85fE65aa1ab6D246774A76eC 0x388a2E4d6792a33AF06D67bc67a881EF176F2BBb

# Timelock（无构造函数参数）
npx hardhat verify --network bsc-testnet 0x68f1753f67973F89e2dd67d45Ec7B06C03A1D64c
```

### 方式2：在 BSCScan 网站上手动验证
1. 访问 [BSCScan Testnet](https://testnet.bscscan.com/)
2. 进入对应合约地址页面
3. 点击 "Contract" 标签
4. 点击 "Verify and Publish"
5. 选择 "Via Standard JSON Input"
6. 上传编译后的 JSON 文件（在 `artifacts/build-info/` 目录）

## 🧪 测试命令

### 运行完整流程测试
```bash
cd packages/contracts
npx hardhat run scripts/full-flow-test.js --network bsc-testnet
```

### 运行场景测试
```bash
cd packages/contracts
USERS=5 SWAPS=20 npx hardhat run scripts/scenarios/reconciliation-test.js --network bsc-testnet
```

## ⚠️ 注意事项

1. **Timelock 所有权**: 当前 Timelock 所有权仍在部署账户，测试网可以保持，主网部署时需要转移到多重签名钱包。

2. **合约验证**: 如果 Hardhat 验证失败，可以在 BSCScan 网站上手动验证。

3. **Gas 费用**: 部署已消耗部分 BNB，剩余余额：0.6264247608 BNB，足够运行测试脚本。

4. **保存信息**: 请妥善保存所有合约地址和部署信息。

## 🔗 相关链接

- [BSCScan Testnet Explorer](https://testnet.bscscan.com/)
- [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)
- [部署信息文件](./deployments/bsc-testnet.json)

---
*部署完成时间: 2025-11-13 16:34:16 UTC*

