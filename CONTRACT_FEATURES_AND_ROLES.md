# ChatOneSwap 合约功能与角色权限表

## 📊 功能权限总览表

> **说明：** 
> - ✅ = **已实现且可执行**
> - ❌ = **已实现但无权限**（功能已实现，只是该角色没有调用权限）
> - ⚠️ = **有条件限制**（需要时间锁或受暂停影响）

| 功能 | 用户 | 创建者/Owner | 管理者 | 时间锁要求 | 暂停影响 | 实现状态 |
|------|------|------------|--------|-----------|---------|---------|
| **交易功能** |
| Swap（交换代币） | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 获取报价（getQuote） | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| **流动性管理** |
| 添加流动性（addLiquidity） | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 移除流动性（removeLiquidity） | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| **池子管理** |
| 创建池子（createPool） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 查询池子信息 | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 查询池子储备量 | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| **资金管理** |
| 存入代币（deposit） | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 提取资金（withdraw） | ❌ 无权限 | ✅ | ✅ | ✅ 48小时 | ⚠️ 暂停时禁止 | ✅ 已实现 |
| 紧急提取（emergencyWithdraw） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| **协议费用** |
| 查看协议费用 | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 提取协议费用（withdrawProtocolFee） | ❌ 无权限 | ✅ | ✅ | ✅ 48小时 | ⚠️ 暂停时禁止 | ✅ 已实现 |
| **参数配置** |
| 设置协议费率（setProtocolFee） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 设置闪电贷费率（setFlashLoanFee） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| **合约初始化** |
| 设置 PoolManager | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 设置 Router | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 设置时间锁（setTimelock） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| **紧急控制** |
| 暂停合约（pause） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | - | ✅ 已实现 |
| 恢复合约（unpause） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | - | ✅ 已实现 |
| **所有权管理** |
| 转移所有权（transferOwnership） | ❌ 无权限 | ✅ | ✅ | ✅ 48小时 | ⚠️ 暂停时禁止 | ✅ 已实现 |
| 放弃所有权（renounceOwnership） | ❌ 无权限 | ✅ | ✅ | ✅ 48小时 | ⚠️ 暂停时禁止 | ✅ 已实现 |
| **时间锁操作** |
| 调度操作（scheduleOperation） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 执行操作（executeOperation） | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 取消操作（cancelOperation） | ❌ 无权限 | ✅ | ❌ 无权限 | ❌ | ❌ 不受影响 | ✅ 已实现 |
| 查询操作状态 | ✅ | ✅ | ✅ | ❌ | ❌ 不受影响 | ✅ 已实现 |

---

## ✅ 功能实现状态说明

**重要说明：** 表格中标记为 ❌ 的功能**均已实现**，只是表示该角色**没有权限**调用该功能。

### 所有功能都已实现 ✅

所有列出的功能都在合约中实现了，包括：

1. **用户无权限但已实现的功能：**
   - ✅ `createPool()` - 创建池子（仅 Owner 可调用）
   - ✅ `withdraw()` - 提取资金（仅 Owner + 时间锁）
   - ✅ `withdrawProtocolFee()` - 提取协议费用（仅 Owner + 时间锁）
   - ✅ `setProtocolFee()` - 设置协议费率（仅 Owner）
   - ✅ `setFlashLoanFee()` - 设置闪电贷费率（仅 Owner）
   - ✅ `pause()` / `unpause()` - 暂停/恢复合约（仅 Owner）
   - ✅ `transferOwnership()` / `renounceOwnership()` - 所有权管理（仅 Owner + 时间锁）
   - ✅ `scheduleOperation()` / `cancelOperation()` - 时间锁操作（仅 Owner）

2. **实现位置：**
   - `ChatOneSwapVault.sol` - 资金管理、协议费用、暂停功能
   - `ChatOneSwapPoolManager.sol` - 池子管理、协议费率设置
   - `ChatOneSwapRouter.sol` - 交易路由、流动性管理
   - `ChatOneSwapTimelock.sol` - 时间锁机制

3. **权限控制：**
   - 使用 `onlyOwner` 修饰符限制 Owner 专用功能
   - 使用 `onlyTimelockOrOwner` 修饰符限制需要时间锁的功能
   - 使用 `whenNotPaused` 修饰符限制暂停时的操作

---

## 👥 不同角色的详细玩法

### 1. 用户（User）👤

**角色定义：** 普通用户，使用 DEX 进行交易和提供流动性

#### ✅ 可以执行的操作

| 操作 | 说明 | 示例 |
|------|------|------|
| **Swap（交换代币）** | 通过 Router 交换代币 | `router.swap(poolKey, USDT, BNB, 100, 95, userAddress)` |
| **获取报价** | 查询 swap 的预期输出 | `router.getQuote(poolKey, USDT, BNB, 100)` |
| **添加流动性** | 向池子提供代币对 | `router.addLiquidity(poolKey, USDT, BNB, 1000, 1000, 0, 0, userAddress)` |
| **移除流动性** | 从池子中移除代币 | `router.removeLiquidity(poolKey, USDT, BNB, liquidityAmount, 0, 0, userAddress)` |
| **查询池子信息** | 查看池子状态、储备量 | `poolManager.getReserves(poolKey)` |
| **存入代币** | 向 Vault 存入代币 | `vault.deposit(token, amount)` |
| **查看协议费用** | 查询累积的协议费用 | `vault.getProtocolFee(token)` |
| **执行时间锁操作** | 执行已就绪的时间锁操作 | `timelock.executeOperation(operationId)` |
| **查询时间锁状态** | 查看待执行操作 | `timelock.getOperation(operationId)` |

#### ❌ 不能执行的操作

- ❌ 创建池子（仅 Owner）
- ❌ 提取资金（仅 Owner + 时间锁）
- ❌ 提取协议费用（仅 Owner + 时间锁）
- ❌ 设置协议参数（仅 Owner）
- ❌ 暂停/恢复合约（仅 Owner）
- ❌ 转移所有权（仅 Owner + 时间锁）
- ❌ 调度时间锁操作（仅 Owner）

---

### 2. 创建者/Owner（Creator/Owner）👑

**角色定义：** 合约部署者和所有者，拥有最高权限

#### ✅ 可以执行的操作

| 操作 | 说明 | 时间锁 | 暂停影响 |
|------|------|--------|---------|
| **所有用户功能** | 可以执行所有用户操作 | ❌ | ❌ |
| **创建池子** | 创建新的交易对池子 | ❌ | ❌ |
| **设置协议费率** | 调整协议费用比例（0-100%） | ❌ | ❌ |
| **设置闪电贷费率** | 调整闪电贷费率（0-10%） | ❌ | ❌ |
| **合约初始化** | 设置 PoolManager、Router、Timelock | ❌ | ❌ |
| **暂停/恢复合约** | 紧急暂停关键操作 | ❌ | - |
| **提取资金** | 从 Vault 提取代币 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **提取协议费用** | 提取累积的协议费用 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **紧急提取** | 绕过时间锁的紧急提取 | ❌ | ❌ |
| **转移所有权** | 将 Owner 转移给新地址 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **放弃所有权** | 放弃合约所有权 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **调度时间锁操作** | 调度需要延迟执行的操作 | ❌ | ❌ |
| **取消时间锁操作** | 取消已调度的操作 | ❌ | ❌ |

#### 🔒 受时间锁限制的操作

以下操作需要通过时间锁（48小时延迟）：

1. **提取资金（withdraw）**
   ```
   步骤：
   1. Owner 调用 timelock.scheduleOperation(vault, withdrawData)
   2. 等待 48 小时
   3. 任何人可以调用 timelock.executeOperation(operationId)
   ```

2. **提取协议费用（withdrawProtocolFee）**
   ```
   步骤：
   1. Owner 调用 timelock.scheduleOperation(vault, withdrawProtocolFeeData)
   2. 等待 48 小时
   3. 任何人可以调用 timelock.executeOperation(operationId)
   ```

3. **转移所有权（transferOwnership）**
   ```
   步骤：
   1. Owner 调用 timelock.scheduleOperation(contract, transferOwnershipData)
   2. 等待 48 小时
   3. 任何人可以调用 timelock.executeOperation(operationId)
   ```

4. **放弃所有权（renounceOwnership）**
   ```
   步骤：
   1. Owner 调用 timelock.scheduleOperation(contract, renounceOwnershipData)
   2. 等待 48 小时
   3. 任何人可以调用 timelock.executeOperation(operationId)
   ```

#### ⚠️ 受暂停影响的操作

当合约被暂停时，以下操作会被禁止：
- ❌ 提取资金（withdraw）
- ❌ 提取协议费用（withdrawProtocolFee）
- ❌ 转移所有权（transferOwnership）
- ❌ 放弃所有权（renounceOwnership）

**注意：** Swap 和流动性操作在暂停时仍然可以正常进行！

---

### 3. 管理者（Manager）👨‍💼

**角色定义：** 通过时间锁获得权限的管理者（通常是 Owner 转移所有权后的新 Owner）

#### ✅ 可以执行的操作

| 操作 | 说明 | 时间锁 | 暂停影响 |
|------|------|--------|---------|
| **所有用户功能** | 可以执行所有用户操作 | ❌ | ❌ |
| **提取资金** | 从 Vault 提取代币 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **提取协议费用** | 提取累积的协议费用 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **转移所有权** | 将 Owner 转移给新地址 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **放弃所有权** | 放弃合约所有权 | ✅ 48小时 | ⚠️ 暂停时禁止 |
| **执行时间锁操作** | 执行已就绪的时间锁操作 | ❌ | ❌ |

#### ❌ 不能执行的操作

- ❌ 创建池子（仅原始 Owner）
- ❌ 设置协议费率（仅原始 Owner）
- ❌ 设置闪电贷费率（仅原始 Owner）
- ❌ 合约初始化（仅原始 Owner）
- ❌ 暂停/恢复合约（仅原始 Owner）
- ❌ 调度时间锁操作（仅原始 Owner）
- ❌ 取消时间锁操作（仅原始 Owner）

**注意：** 管理者主要是通过时间锁机制获得资金和所有权管理权限，但无法修改协议参数。

---

## 🔄 典型使用场景

### 场景 1：用户进行 Swap

```
1. 用户调用 router.swap(poolKey, tokenIn, tokenOut, amountIn, minOut, recipient)
2. Router 从用户接收 tokenIn
3. Router 将 tokenIn 存入 Vault
4. PoolManager 更新池子储备量并计算协议费用
5. PoolManager 从 Vault 提取 tokenOut 给用户
```

**权限：** ✅ 任何用户都可以执行

---

### 场景 2：用户添加流动性

```
1. 用户调用 router.addLiquidity(poolKey, token0, token1, amount0, amount1, ...)
2. Router 从用户接收 token0 和 token1
3. Router 将代币存入 Vault
4. PoolManager 计算流动性份额并更新储备量
5. 用户获得流动性份额
```

**权限：** ✅ 任何用户都可以执行

---

### 场景 3：Owner 创建新池子

```
1. Owner 调用 poolManager.createPool(token0, token1, fee)
2. 系统验证参数（token 地址、费率范围）
3. 创建新的 Pool 结构
4. 发出 PoolCreated 事件
```

**权限：** ✅ 仅 Owner 可以执行

---

### 场景 4：Owner 提取协议费用（通过时间锁）

```
1. Owner 调用 timelock.scheduleOperation(vault, withdrawProtocolFeeData)
   - 操作被调度，48小时后可执行
2. 等待 48 小时
3. 任何人调用 timelock.executeOperation(operationId)
   - 协议费用被提取到指定地址
```

**权限：** 
- 调度：✅ 仅 Owner
- 执行：✅ 任何人（48小时后）

---

### 场景 5：Owner 紧急暂停

```
1. Owner 调用 vault.pause() / poolManager.pause() / router.pause()
2. 合约进入暂停状态
3. 提取和所有权转移操作被禁止
4. Swap 和流动性操作仍然可以正常进行
5. Owner 可以随时调用 unpause() 恢复
```

**权限：** ✅ 仅 Owner 可以执行

---

## 📋 功能详细说明

### 交易功能

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| Swap | Router | `swap()` | 执行代币交换，使用恒定乘积公式 |
| 获取报价 | Router | `getQuote()` | 查询 swap 的预期输出，不执行交易 |

### 流动性管理

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 添加流动性 | Router | `addLiquidity()` | 向池子提供代币对，获得流动性份额 |
| 移除流动性 | Router | `removeLiquidity()` | 从池子移除代币，销毁流动性份额 |

### 池子管理

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 创建池子 | PoolManager | `createPool()` | 创建新的交易对池子（仅 Owner） |
| 查询池子 | PoolManager | `getPool()` | 获取池子基本信息 |
| 查询储备量 | PoolManager | `getReserves()` | 获取池子当前储备量 |
| 检查池子存在 | PoolManager | `poolExists()` | 检查池子是否存在 |

### 资金管理

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 存入代币 | Vault | `deposit()` | 向 Vault 存入代币 |
| 提取资金 | Vault | `withdraw()` | 从 Vault 提取代币（需时间锁） |
| 紧急提取 | Vault | `emergencyWithdraw()` | 紧急提取，绕过时间锁（仅 Owner） |

### 协议费用

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 查看协议费用 | Vault | `getProtocolFee()` | 查询累积的协议费用 |
| 提取协议费用 | Vault | `withdrawProtocolFee()` | 提取协议费用（需时间锁） |
| 累积协议费用 | Vault | `accumulateProtocolFee()` | 由 PoolManager 调用，累积费用 |

### 参数配置

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 设置协议费率 | PoolManager | `setProtocolFee()` | 设置协议费用比例（0-100%） |
| 设置闪电贷费率 | Vault | `setFlashLoanFee()` | 设置闪电贷费率（0-10%） |

### 紧急控制

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 暂停合约 | Vault/PoolManager/Router | `pause()` | 暂停关键操作（仅 Owner） |
| 恢复合约 | Vault/PoolManager/Router | `unpause()` | 恢复合约（仅 Owner） |

### 所有权管理

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 转移所有权 | 所有合约 | `transferOwnership()` | 转移 Owner（需时间锁） |
| 放弃所有权 | 所有合约 | `renounceOwnership()` | 放弃 Owner（需时间锁） |

### 时间锁操作

| 功能 | 合约 | 函数 | 说明 |
|------|------|------|------|
| 调度操作 | Timelock | `scheduleOperation()` | 调度需要延迟执行的操作（仅 Owner） |
| 执行操作 | Timelock | `executeOperation()` | 执行已就绪的操作（任何人） |
| 取消操作 | Timelock | `cancelOperation()` | 取消已调度的操作（仅 Owner） |
| 查询操作 | Timelock | `getOperation()` | 查询操作状态（任何人） |

---

## 🔐 安全机制

### 1. 时间锁机制（48小时延迟）

**受保护的操作：**
- ✅ 提取资金（withdraw）
- ✅ 提取协议费用（withdrawProtocolFee）
- ✅ 转移所有权（transferOwnership）
- ✅ 放弃所有权（renounceOwnership）

**流程：**
1. Owner 调度操作 → 等待 48 小时 → 任何人可以执行

### 2. 暂停机制

**暂停时禁止的操作：**
- ❌ 提取资金
- ❌ 提取协议费用
- ❌ 转移所有权
- ❌ 放弃所有权

**暂停时仍可执行的操作：**
- ✅ Swap
- ✅ 添加/移除流动性
- ✅ 存入代币
- ✅ 查询操作

### 3. 访问控制

- **onlyOwner**：仅 Owner 可以执行
- **onlyTimelockOrOwner**：时间锁或 Owner 可以执行
- **onlyRouter**：仅 Router 可以执行
- **onlyPoolManager**：仅 PoolManager 可以执行

---

## 📊 权限矩阵总结

| 功能 | 用户 | Owner | 时间锁 | 暂停影响 |
|------|------|-------|--------|---------|
| Swap | ✅ | ✅ | ❌ | ❌ |
| 流动性操作 | ✅ | ✅ | ❌ | ❌ |
| 创建池子 | ❌ | ✅ | ❌ | ❌ |
| 设置参数 | ❌ | ✅ | ❌ | ❌ |
| 提取资金 | ❌ | ✅ | ✅ | ⚠️ |
| 提取协议费用 | ❌ | ✅ | ✅ | ⚠️ |
| 转移所有权 | ❌ | ✅ | ✅ | ⚠️ |
| 暂停合约 | ❌ | ✅ | ❌ | - |

---

