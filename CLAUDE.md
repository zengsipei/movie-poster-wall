# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

电影海报墙 — 一个零依赖的电影海报墙网页应用，使用原生 HTML5/CSS3/JavaScript 构建，数据来自 TMDB（The Movie Database）。支持 Mock 本地数据和真实 API 两种模式。

## Running the Project

```powershell
# 方式一：直接双击 index.html（使用本地 JSON 数据，完全离线）

# 方式二：Node.js 本地服务（支持 API 数据同步）
node server.js
# 访问 http://localhost:3000
```

无需 npm install，server.js 仅使用 Node 内置模块（http, fs, path）。

## Architecture

三页面静态应用，无框架、无构建工具：

- `index.html` — 首页，全屏轮播海报墙
- `detail.html` — 电影详情页（通过 `?id=<tmdb_id>` 传参）
- `favorites.html` — 收藏页（localStorage 持久化）

### JS 模块职责

所有页面通过 `<script>` 标签按顺序加载，无模块系统：

1. `js/data.js` — 数据层：CONFIG 配置、MOCK_DATA 内嵌数据、TMDB API 封装、本地 JSON 读取与同步写入
2. `js/common.js` — 公共层：ThemeManager（主题切换）、FavoritesManager（收藏管理，localStorage）、工具函数
3. `js/index.js` / `js/detail.js` / `js/favorites.js` — 各页面独立逻辑

### 数据流

- Mock 模式（默认）：`data/upcoming.json` + `data/movies/<id>.json` → 页面渲染
- API 模式：TMDB API → 页面渲染 → 通过 `POST /sync/*` 写回本地 JSON（需 server.js）
- 降级链：本地 JSON → 内嵌 MOCK_DATA（`js/data.js` 中硬编码）

### 主题系统

CSS 变量定义在 `css/common.css`，通过 `html[data-theme="light"]` 切换深色/浅色。用户偏好存储在 localStorage key `movie-wall-theme`。

## Key Configuration

`js/data.js` 顶部的 CONFIG 对象控制数据模式：
- `USE_MOCK: true` — 使用本地 JSON
- `TMDB_TOKEN` — 填入 Bearer Token 后自动切换为 API 模式
- `file://` 协议下强制 Mock 模式

## Server Sync API

server.js 提供两个写入端点（仅 API 模式下使用）：
- `POST /sync/upcoming` → 写入 `data/upcoming.json`
- `POST /sync/movie/:id` → 写入 `data/movies/:id.json`

## Conventions

- 语言：中文界面，代码注释中文
- 收藏数据 localStorage key：`movie-wall-favorites`（存储电影 ID 数组）
- 图片 URL 统一通过 `getImageUrl(path, size)` 生成，基于 TMDB CDN
- 电影 ID 使用 TMDB 数字 ID，在 FavoritesManager 中统一转为 Number 类型比较
