# Open Graph 图片创建指南

## 图片规格要求

### 推荐尺寸
- **Facebook/Open Graph**: 1200 x 630 像素（1.91:1 比例）
- **Twitter**: 1200 x 675 像素（16:9 比例）
- **通用推荐**: 1200 x 630 像素（兼容大部分平台）

### 文件格式
- PNG（推荐，支持透明背景）
- JPG（文件更小，但不支持透明）

### 文件大小
- 建议小于 1MB
- 推荐 200-500KB 之间

## 图片内容建议

### 必须包含的元素
1. **Logo/品牌标识** - ChatOneSwap logo
2. **标题** - "ChatOneSwap" 或 "ChatOneSwap - Decentralized Exchange"
3. **副标题/描述** - "Swap, Add Liquidity, Trade on BSC"
4. **视觉元素** - 与 DeFi/DEX 相关的图标或图形

### 设计建议
- 使用品牌色彩（参考 `tailwind.config.js` 中的颜色）
- 保持简洁，文字清晰可读
- 确保在移动端和桌面端都清晰可见
- 避免使用过小的字体（最小 24px）

## 创建方式

### 方式 1: 使用在线工具（推荐）
1. **Canva** - https://www.canva.com/
   - 搜索 "Facebook Post" 模板（1200x630）
   - 自定义设计
   - 导出为 PNG

2. **Figma** - https://www.figma.com/
   - 创建 1200x630 画布
   - 设计并导出

3. **OG Image Generator** - https://og-image.vercel.app/
   - 在线生成 OG 图片

### 方式 2: 使用设计软件
- Adobe Photoshop
- Adobe Illustrator
- Sketch
- GIMP（免费）

### 方式 3: 使用代码生成（高级）
可以使用 `@vercel/og` 或 `satori` 等库动态生成

## 放置位置

创建完成后，将图片命名为 `og-image.png` 并放置在：
```
public/og-image.png
```

## 更新配置

图片创建后，确保 `index.html` 中的路径正确：
```html
<meta property="og:image" content="https://swap.chatone.info/og-image.png" />
<meta property="twitter:image" content="https://swap.chatone.info/og-image.png" />
```

## 测试

创建后，可以使用以下工具测试：
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

## 临时方案

目前使用 `favicon.ico` 作为临时占位符。创建专业 OG 图片后，请替换为 `og-image.png`。

