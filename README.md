
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
sql
– 笔记主表
CREATE TABLE IF NOT EXISTS notes (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL DEFAULT ‘未命名’,
content TEXT DEFAULT ‘’,
userId TEXT NOT NULL DEFAULT ‘default-user’,
createdAt INTEGER NOT NULL,
updatedAt INTEGER NOT NULL,
pinned INTEGER DEFAULT 0,
sort_order INTEGER DEFAULT 0
);

– 幂等去重表
CREATE TABLE IF NOT EXISTS idempotency (
key TEXT PRIMARY KEY,
method TEXT NOT NULL,
path TEXT NOT NULL,
response_status INTEGER NOT NULL,
response_body TEXT,
created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency(created_at);

### 第二步：部署 Worker 后端

1. 在 **Workers & Pages** 中创建一个新的 Worker（例如命名为 `textvault-api`）。
2. 将以下代码粘贴到 Worker 的在线编辑器中并部署：
javascript
export default {
async fetch(request, env, ctx) {
const url = new URL(request.url);
const token = request.headers.get(‘Authorization’)?.replace('Bearer ', ‘’);
const userId = token || ‘default-user’; // 单用户模式下，token 仅作为简单鉴权
const db = env.DB;
// 注意：将此处 Origin 换成你自己的前端域名
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-frontend.pages.dev' ,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
  'Access-Control-Max-Age': '86400',
};

if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders });
}

const pathParts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
if (pathParts[0] !== 'api' || pathParts[1] !== 'notes') {
  return new Response('Not found', { status: 404, headers: corsHeaders });
}
const noteId = pathParts[2] || null;

// 幂等键检查
const idemKey = request.headers.get('Idempotency-Key');
if (idemKey && request.method === 'POST' && !noteId) {
  const cached = await db.prepare('SELECT response_status, response_body FROM idempotency WHERE key = ?').bind(idemKey).first();
  if (cached) {
    return new Response(cached.response_body, { status: cached.response_status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
}

if (idemKey) ctx.waitUntil(cleanupIdempotency(db));

try {
  // GET 列表
  if (request.method === 'GET' && !noteId) {
    const { results } = await db.prepare(
      `SELECT id, name, LENGTH(content) as charCount, createdAt, updatedAt, pinned, sort_order FROM notes WHERE userId = ? ORDER BY pinned DESC, sort_order ASC, updatedAt DESC`
    ).bind(userId).run();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  // GET 详情
  if (request.method === 'GET' && noteId) {
    const { results } = await db.prepare(`SELECT * FROM notes WHERE id = ? AND userId = ?`).bind(noteId, userId).run();
    if (!results.length) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    return new Response(JSON.stringify(results[0]), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  // POST 创建
  if (request.method === 'POST' && !noteId) {
    const body = await request.json();
    const { name, content, pinned, sort_order } = body;
    const now = Date.now();
    const { results } = await db.prepare(
      `INSERT INTO notes (name, content, userId, createdAt, updatedAt, pinned, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
    ).bind(name || '未命名', content || '', userId, now, now, pinned || 0, sort_order || 0).run();
    
    const responseBody = JSON.stringify(results[0]);
    if (idemKey) {
      await db.prepare(`INSERT OR IGNORE INTO idempotency (key, method, path, response_status, response_body, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(idemKey, 'POST', '/api/notes', 201, responseBody, Math.floor(now / 1000)).run();
    }
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  // PUT 更新
  if (request.method === 'PUT' && noteId) {
    const body = await request.json();
    const { name, content, pinned, sort_order } = body;
    const now = Date.now();
    const fields = []; const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (content !== undefined) { fields.push('content = ?'); params.push(content); }
    if (pinned !== undefined) { fields.push('pinned = ?'); params.push(pinned); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
    if (!fields.length) return new Response(JSON.stringify({ error: 'No fields' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    
    fields.push('updatedAt = ?'); params.push(now); params.push(noteId); params.push(userId);
    const { results } = await db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND userId = ? RETURNING *`).bind(...params).run();
    if (!results.length) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    return new Response(JSON.stringify(results[0]), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  // DELETE 删除
  if (request.method === 'DELETE' && noteId) {
    await db.prepare('DELETE FROM notes WHERE id = ? AND userId = ?').bind(noteId, userId).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
} catch (err) {
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}
}
};

async function cleanupIdempotency(db) {
const cutoff = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
await db.prepare(‘DELETE FROM idempotency WHERE created_at < ?’).bind(cutoff).run();
}


3. **绑定 D1 数据库**：在 Worker 的 **设置 -> 绑定** 中，添加 D1 绑定，变量名设为 `DB`，选择刚才创建的数据库。

### 第三步：部署前端

1. 将本项目的 HTML 文件下载到本地。
2. 打开 HTML 文件，找到底部的 `<script>` 标签内：
   - 修改 `API_BASE` 常量为你的 Worker 域名（例如 `https://textvault-api.your-name.workers.dev/api/notes`） 。
3. 登录 Cloudflare Dashboard，进入 **Workers & Pages -> 创建应用程序 -> Pages -> 上传资产**。
4. 将修改后的 HTML 文件打包成 `.zip` 上传，或直接使用直接上传文件方式部署。
5. 部署完成后，你会获得一个 `xxx.pages.dev` 的域名。

### 第四步：配置鉴权 Token

1. 打开你的前端页面。
2. 在浏览器的开发者工具（F12）的 **Console** 中，运行以下命令设置你的专属访问 Token：
javascript
localStorage.setItem(‘token’, ‘你的自定义密码’);

3. 刷新页面，应用将自动使用该 Token 进行身份验证与数据隔离。

## ⌨️ 快捷键

| 快捷键 | 功能 |
| :--- | :--- |
| `Ctrl` + `N` | 新建文件 |
| `Ctrl` + `O` | 导入本地文件 |
| `Ctrl` + `S` | 强制保存当前文件 |
| `Ctrl` + `F` | 打开搜索面板 |
| `Enter` | 跳转到下一个搜索匹配 |
| `Shift` + `Enter` | 跳转到上一个搜索匹配 |
| `Esc` | 关闭面板 / 退出专注模式 |
| `Ctrl` + `Z` / `Y` | 撤销 / 重做 |
| `Ctrl` + `B` | 加粗 |
| `Ctrl` + `U` | 下划线 |
| `Tab` | 插入缩进 |
| `F11` | 切换专注模式 |

## 📝 许可证

本项目采用 [MIT License](LICENSE) 开源。
说明：
这份 README.md 结构清晰，包含了徽章、特性介绍、详细部署步骤（D1、Worker、前端、Token设置）以及快捷键说明。部署指南中的 Worker 代码已经帮你写成了精简版并包含在 Markdown 中，方便看仓库的人一键复制。你可以直接将代码块中的 https://your-frontend.pages.dev 替换成你真实的域名以作为最终版本提交。
