# 禁用邮箱登录配置说明

## 问题说明

AppKit 默认可能包含邮箱登录功能，这可能导致：
1. 弹窗中显示邮箱登录选项
2. 点击邮箱登录后，钱包文案可能丢失

## 解决方案

### 方法 1: 在 Reown Dashboard 中禁用（推荐）

1. 访问 [Reown Dashboard](https://dashboard.reown.com)
2. 选择你的项目
3. 进入 **Settings** 或 **Features** 页面
4. 找到 **Email Login** 或 **Social Login** 选项
5. 禁用邮箱登录功能

### 方法 2: 确保 Metadata 配置正确

确保 `metadata` 配置中**不包含**邮箱相关字段：

```typescript
// ✅ 正确配置
const appMetadata = {
  name: 'ChatOneSwap',
  description: 'ChatOneSwap - Decentralized Exchange',
  url: 'https://swapV3.chatone.info',
  icons: ['https://...']
  // 不包含 email、emailUrl 等字段
}

// ❌ 错误配置（不要这样做）
const appMetadata = {
  name: 'ChatOneSwap',
  email: 'xxx@example.com', // 不要包含邮箱
  emailUrl: 'mailto:...',    // 不要包含邮箱链接
}
```

### 方法 3: 检查 WagmiAdapter 配置

`WagmiAdapter` 默认只包含钱包连接方式（WalletConnect、Coinbase、Injected），不包含邮箱登录。邮箱登录功能由 AppKit Cloud 配置控制。

## 当前配置状态

✅ **已确保：**
- `metadata` 配置中不包含邮箱字段
- 只包含必要的字段：`name`、`description`、`url`、`icons`
- `WagmiAdapter` 配置正确

⚠️ **需要检查：**
- 在 Reown Dashboard 中确认邮箱登录功能已禁用
- 如果问题仍然存在，检查 Dashboard 中的项目配置

## 验证步骤

1. 打开应用
2. 点击钱包连接按钮
3. 检查弹窗中是否还有邮箱登录选项
4. 如果仍有邮箱登录选项，需要在 Dashboard 中禁用

## 相关链接

- [Reown Dashboard](https://dashboard.reown.com)
- [AppKit 文档](https://docs.reown.com/appkit)

