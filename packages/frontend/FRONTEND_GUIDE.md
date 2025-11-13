# ChatOneSwap 前端开发指南

## 概述

本文档介绍 ChatOneSwap 前端项目的开发、测试和安全防护最佳实践。

## 项目结构

```
src/
├── components/          # React 组件
│   ├── Layout.tsx      # 布局组件
│   └── ErrorBoundary.tsx # 错误边界
├── config/             # 配置文件
│   ├── contracts.ts    # 合约地址和 ABI
│   └── wagmi.ts        # Wagmi 配置
├── hooks/              # 自定义 Hooks
│   ├── useSwap.ts      # Swap 功能 Hook
│   └── useSecurity.ts  # 安全相关 Hook
├── utils/              # 工具函数
│   ├── security.ts     # 安全工具函数
│   ├── env.ts          # 环境变量管理
│   └── errors.ts       # 错误处理
├── views/              # 页面组件
│   ├── Swap.tsx        # Swap 页面
│   ├── Liquidity.tsx   # 流动性页面
│   └── Pools.tsx       # 池子页面
└── test/               # 测试配置
    └── setup.ts        # 测试设置
```

## 安全防护

### 1. 输入验证

所有用户输入都经过严格验证：

- **Token 数量验证** (`validateTokenAmount`): 验证数字格式、精度、范围
- **地址验证** (`isValidAddress`): 验证以太坊地址格式
- **XSS 防护** (`sanitizeInput`): 转义 HTML 特殊字符
- **CSRF 防护**: 使用 CSRF token 保护关键操作

### 2. 速率限制

使用 `checkRateLimit` 防止暴力攻击：

```typescript
import { checkRateLimit } from '@/utils/security'

if (!checkRateLimit('swap', 10, 60000)) {
  // 限制：60秒内最多10次
  throw new Error('Too many requests')
}
```

### 3. 安全 Headers

在 `vite.config.ts` 中配置了安全响应头：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 4. ESLint 安全规则

使用 `eslint-plugin-security` 检测常见安全问题：

- 禁止使用 `eval()`
- 检测不安全的正则表达式
- 检测可能的时序攻击
- 检测对象注入漏洞

## 测试

### 单元测试

使用 Vitest + React Testing Library：

```bash
# 运行测试
npm run test

# 查看测试覆盖率
npm run test:coverage

# 使用 UI 模式
npm run test:ui
```

### E2E 测试

使用 Playwright：

```bash
# 运行 E2E 测试
npm run test:e2e
```

### 测试文件结构

```
src/
├── utils/
│   └── __tests__/
│       └── security.test.ts
├── components/
│   └── __tests__/
│       └── ErrorBoundary.test.tsx
└── views/
    └── __tests__/
        └── Swap.test.tsx
```

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
VITE_WALLET_CONNECT_PROJECT_ID=your-project-id
VITE_CHAIN_ID=97
VITE_ENABLE_ANALYTICS=false
```

环境变量在 `src/utils/env.ts` 中验证，确保必需变量存在。

## 错误处理

### 错误边界

使用 `ErrorBoundary` 组件捕获 React 错误：

```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 错误类型

- `ValidationError`: 输入验证错误
- `SecurityError`: 安全相关错误
- `NetworkError`: 网络错误
- `AppError`: 通用应用错误

### 错误日志

在开发环境，错误会输出到控制台。在生产环境，应集成错误追踪服务（如 Sentry）。

## 性能优化

### 代码分割

使用 React.lazy 和 Suspense 实现路由级别的代码分割：

```tsx
const Swap = lazy(() => import('./views/Swap'))
```

### 构建优化

- 手动代码分割：React 和 Web3 库分别打包
- 生产构建移除 console 和 debugger
- 启用 sourcemap 用于调试

## 开发最佳实践

### 1. 类型安全

- 使用 TypeScript 严格模式
- 所有函数参数和返回值都有类型定义
- 使用 `as const` 确保类型推断

### 2. 组件设计

- 单一职责原则
- 使用自定义 Hooks 提取逻辑
- 保持组件小而专注

### 3. 状态管理

- 使用 Zustand 进行全局状态管理
- 使用 React Query 管理服务器状态
- 本地状态使用 useState/useReducer

### 4. 安全编码

- 永远不要信任用户输入
- 验证所有外部数据
- 使用参数化查询（对于 API 调用）
- 避免使用 `dangerouslySetInnerHTML`

## 代码审查清单

- [ ] 所有用户输入都经过验证
- [ ] 错误处理完善
- [ ] 测试覆盖率达到要求
- [ ] 没有安全漏洞（运行 `npm run lint`）
- [ ] 性能优化（代码分割、懒加载）
- [ ] 可访问性（ARIA 标签）
- [ ] 响应式设计

## 部署前检查

1. **运行测试**: `npm run test`
2. **类型检查**: `npm run type-check`
3. **Lint 检查**: `npm run lint`
4. **构建测试**: `npm run build`
5. **安全检查**: 审查安全工具函数的使用
6. **性能测试**: 检查 Lighthouse 分数

## 常见问题

### Q: 如何添加新的安全规则？

A: 在 `src/utils/security.ts` 中添加新的验证函数，并在 ESLint 配置中添加相应规则。

### Q: 如何添加新的测试？

A: 在对应的 `__tests__` 目录下创建测试文件，使用 Vitest 和 React Testing Library。

### Q: 如何处理 Web3 错误？

A: 使用 `useSwap` Hook 中的错误处理，或创建自定义错误处理 Hook。

## 参考资源

- [React 文档](https://react.dev)
- [Vitest 文档](https://vitest.dev)
- [Playwright 文档](https://playwright.dev)
- [Wagmi 文档](https://wagmi.sh)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

