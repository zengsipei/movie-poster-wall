# TMDB Token 环境变量化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 TMDB Bearer Token 从 `js/data.js` 硬编码迁移到 `.env` 环境变量，通过 `server.js` 的 `/env.js` 端点注入浏览器，并提交 `.env.example` 作为配置说明。

**Architecture:** `server.js` 启动时读取项目根目录的 `.env` 文件（纯 `fs` 实现，无需 dotenv），新增 `/env.js` 路由返回 `window.TMDB_TOKEN = "..."` 脚本；三个 HTML 页面在 `js/data.js` 之前加载 `/env.js`；`js/data.js` 改为读取 `window.TMDB_TOKEN || ''`。`file://` 协议下 `/env.js` 不可达，自动降级为 Mock 模式，行为不变。

**Tech Stack:** Node.js 内置 `fs`/`http`/`path`，原生 HTML/JS，无构建工具，无 npm 依赖

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `.env` | 含真实 token，加入 `.gitignore` |
| 新建 | `.env.example` | 占位符版本，提交到 git |
| 修改 | `.gitignore` | 添加 `.env` 忽略规则 |
| 修改 | `server.js` | 读取 `.env`，新增 `/env.js` 路由 |
| 修改 | `index.html` | 在 `js/data.js` 前加 `<script src="/env.js">` |
| 修改 | `detail.html` | 同上 |
| 修改 | `favorites.html` | 同上 |
| 修改 | `js/data.js` | `tmdb_token` 改为读取 `window.TMDB_TOKEN \|\| ''` |

---

### Task 1: 创建 `.env` 和 `.env.example`，更新 `.gitignore`

**Files:**
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: 创建 `.env`（含真实 token，不提交）**

文件内容：
```
TMDB_TOKEN=
```

- [ ] **Step 2: 创建 `.env.example`（占位符，提交到 git）**

文件内容：
```
# TMDB Bearer Token
# 获取地址：https://www.themoviedb.org/settings/api
# 填入后重命名为 .env，然后启动 node server.js
TMDB_TOKEN=your_tmdb_bearer_token_here
```

- [ ] **Step 3: 在 `.gitignore` 末尾追加 `.env` 忽略规则**

在 `.gitignore` 末尾添加：
```
# Environment variables (contains secrets)
.env
```

- [ ] **Step 4: 验证 `.gitignore` 生效**

运行：
```powershell
git status
```
预期：`.env` 不出现在 untracked files 列表中；`.env.example` 出现在 untracked files 中。

- [ ] **Step 5: 提交**

```powershell
git add .env.example .gitignore
git commit -m "chore: add .env.example and gitignore .env"
```

---

### Task 2: `server.js` 读取 `.env` 并新增 `/env.js` 路由

**Files:**
- Modify: `server.js`

- [ ] **Step 1: 在 `server.js` 顶部（`const http = require('http');` 之后）添加 `.env` 解析函数**

在第 4 行 `const http = require('http');` 之后插入：

```js
// 读取 .env 文件，返回 key-value 对象（不依赖第三方包）
function loadEnv() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    return Object.fromEntries(
      raw.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          const idx = line.indexOf('=');
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const ENV = loadEnv();
const TMDB_TOKEN = process.env.TMDB_TOKEN || ENV.TMDB_TOKEN || '';
```

注意：`loadEnv` 使用了 `fs` 和 `path`，这两个模块在文件后面才 `require`。需要将插入位置调整到 `const fs = require('fs');` 和 `const path = require('path');` 之后。实际插入位置是第 6 行（`const path = require('path');`）之后。

- [ ] **Step 2: 在请求处理器中新增 `/env.js` 路由**

在 `server.js` 的请求处理函数（`http.createServer` 回调）中，`OPTIONS` 预检处理之后、`/sync/upcoming` 路由之前，插入：

```js
  // 注入前端环境变量
  if (req.method === 'GET' && req.url === '/env.js') {
    const script = `window.TMDB_TOKEN = ${JSON.stringify(TMDB_TOKEN)};`;
    return send(res, 200, script, { 'Content-Type': 'application/javascript; charset=utf-8' });
  }
```

- [ ] **Step 3: 手动验证路由**

启动服务：
```powershell
node server.js
```

在浏览器访问 `http://localhost:3000/env.js`，预期输出：
```js
window.TMDB_TOKEN = "eyJhbGci...";
```

若 `.env` 不存在，预期输出：
```js
window.TMDB_TOKEN = "";
```

停止服务（Ctrl+C）。

- [ ] **Step 4: 提交**

```powershell
git add server.js
git commit -m "feat: serve /env.js endpoint to inject TMDB_TOKEN from .env"
```

---

### Task 3: 三个 HTML 页面加载 `/env.js`

**Files:**
- Modify: `index.html:60`
- Modify: `detail.html:43`
- Modify: `favorites.html:43`

- [ ] **Step 1: 修改 `index.html`**

找到第 60 行：
```html
    <script src="js/data.js"></script>
```
在其前面插入一行：
```html
    <script src="/env.js" onerror="window.TMDB_TOKEN=window.TMDB_TOKEN||''"></script>
    <script src="js/data.js"></script>
```

`onerror` 确保 `file://` 协议下加载失败时 `window.TMDB_TOKEN` 仍为空字符串，不抛出异常。

- [ ] **Step 2: 修改 `detail.html`**

找到第 43 行：
```html
    <script src="js/data.js"></script>
```
在其前面插入：
```html
    <script src="/env.js" onerror="window.TMDB_TOKEN=window.TMDB_TOKEN||''"></script>
    <script src="js/data.js"></script>
```

- [ ] **Step 3: 修改 `favorites.html`**

找到第 43 行：
```html
    <script src="js/data.js"></script>
```
在其前面插入：
```html
    <script src="/env.js" onerror="window.TMDB_TOKEN=window.TMDB_TOKEN||''"></script>
    <script src="js/data.js"></script>
```

- [ ] **Step 4: 提交**

```powershell
git add index.html detail.html favorites.html
git commit -m "feat: load /env.js before data.js in all HTML pages"
```

---

### Task 4: `js/data.js` 改为读取 `window.TMDB_TOKEN`

**Files:**
- Modify: `js/data.js:1-2`

- [ ] **Step 1: 修改 `js/data.js` 第 1-2 行**

将：
```js
// TMDB API 配置
const tmdb_token = ''; // YOUR_TMDB_BEARER_TOKEN
```

改为：
```js
// TMDB API 配置（token 由 server.js 通过 /env.js 注入，file:// 协议下为空）
const tmdb_token = (typeof window !== 'undefined' && window.TMDB_TOKEN) || '';
```

其余代码（`isFileProtocol`、`CONFIG` 等）保持不变，逻辑自动生效：token 非空时 `USE_MOCK` 为 `false`，切换为 API 模式。

- [ ] **Step 2: 验证端到端流程**

启动服务：
```powershell
node server.js
```

打开 `http://localhost:3000`，打开浏览器开发者工具 Console，运行：
```js
console.log(window.TMDB_TOKEN)   // 应输出完整 token 字符串
console.log(CONFIG.USE_MOCK)     // 应输出 false（token 非空时）
```

- [ ] **Step 3: 提交**

```powershell
git add js/data.js
git commit -m "feat: read TMDB_TOKEN from window global injected by /env.js"
```

---

## 自检

- [x] **Spec 覆盖**：token 环境变量化 ✓、`/env.js` 端点 ✓、HTML 注入 ✓、`data.js` 读取全局变量 ✓、`.env.example` 提交 ✓、`.env` gitignore ✓
- [x] **占位符扫描**：无 TBD/TODO
- [x] **类型一致性**：`TMDB_TOKEN` 变量名在 `server.js`、`/env.js` 输出、`window.TMDB_TOKEN`、`js/data.js` 中保持一致
- [x] **降级路径**：`file://` 协议下 `/env.js` 加载失败 → `onerror` 设置空字符串 → `tmdb_token` 为空 → `USE_MOCK: true`，行为与改动前完全一致
