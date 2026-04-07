# ai-poster 项目备忘

## 项目概述
- AI 海报生成系统：模板编辑器 + 批量海报生成
- 技术栈：Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + SQLite/Prisma

## 已完成的修改 (2026-04-07)

### 1. 局域网访问修复
- `package.json`: dev 脚本改为 `next dev -H 0.0.0.0`
- `next.config.ts`: 添加 `allowedDevHosts` 支持所有局域网 IP（正则匹配）
- 解决了 192.168.x.x 访问时 WebSocket HMR 连接失败和 Host 校验拦截问题

### 2. 文字显示修复
- `globals.css`: 修复 `::root` → `:root` 伪类语法错误
- 删除了 `@media (prefers-color-scheme: dark)` 暗色模式适配（Next.js 默认模板遗留），解决了深色模式系统电脑上文字颜色变浅看不清的问题
- 添加了 `::placeholder` 全局样式，加深 placeholder 颜色到 zinc-500

### 3. 画布缩放功能
- PosterBuilder（编辑器）和 GenerateTemplateClient（生成页）都添加了画布缩放
- 缩放方式：`Ctrl/Cmd + 鼠标滚轮`
- 缩放原点：`top left`（左上角），避免缩放后需要滚动
- 自动适配：画布尺寸变化或窗口大小变化时自动计算 fitScale
- 保留「适应屏幕」按钮用于一键恢复
- **使用 CSS `zoom` 而非 `transform: scale()`**——zoom 改变实际布局大小，getBoundingClientRect 和 Rnd 内部计算都自动正确
- `Rnd` 不需要传 `scale` 属性
- `onResizeStop` 中 `offsetWidth/Height` 需除以 scale 转回画布原始坐标
- `addElementAt` 中坐标转换需除以 scale
