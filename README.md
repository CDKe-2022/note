
# TextVault — 多端共享备忘录
Write by AI

TextVault 是一款简洁、纯粹、专注的本地化优先文本编辑器。前端采用纯原生 HTML/CSS/JS 构建，无需任何构建步骤；后端基于 Cloudflare Workers + D1 数据库，实现轻量级的多端数据同步与离线容灾。

![Cloudflare Workers](https://img.shields.io/badge/Backend-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1-F38020?logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

## ✨ 特性

- **零依赖前端**：纯单文件 HTML，无需 Node.js 或打包工具，双击即可运行。
- **多文件管理**：支持新建、重命名、删除，支持文件拖拽排序与置顶。
- **强大的离线容灾**：
  - 所有写操作支持离线队列，联网后自动重放。
  - 基于 `Idempotency-Key` 的请求去重机制，防止弱网重放导致数据重复。
- **安全的富文本编辑**：
  - 使用 `DOMPurify` 进行严格的 HTML 过滤。
  - 禁用危险 CSS 属性（如 `position: fixed`），防止界面被篡改。
  - 修复了小写字母 `p`、`g`、`y` 等下伸笔画遮挡下划线的排版问题。
- **TreeWalker 搜索引擎**：
  - 彻底废弃非标准的 `window.find()` API。
  - 全局搜索、当前文件搜索、高亮与替换均基于 `TreeWalker` 与 `Range` 实现，绝不破坏 DOM 结构。
- **撤销栈隔离**：每个文件维护独立的撤销/重做历史，切换文件不污染编辑状态。
- **专注体验**：支持深色模式、专注模式、字体缩放，完善的键盘快捷键。

## 🛠 技术栈

- **前端**：原生 HTML5, CSS3, JavaScript (ES6+), DOMPurify
- **后端**：Cloudflare Workers (Serverless API)
- **数据库**：Cloudflare D1 (SQLite)

## 🚀 部署指南

本项目分为前端（静态页面）和后端（Workers API）两部分，推荐均部署到 Cloudflare 以获得最佳体验。

### 第一步：创建 D1 数据库

1. 登录 Cloudflare Dashboard，进入 **Workers & Pages** -> **D1**。
2. 创建一个新的 D1 数据库（例如命名为 `textvault`）。
3. 在数据库控制台的 **Console** 中，执行以下 SQL 语句创建数据表：

