// 简易本地服务：静态托管 + 同步写入 JSON
// 无需第三方依赖（仅使用 Node 内置模块）

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const MOVIES_DIR = path.join(DATA_DIR, 'movies');
const PORT = process.env.PORT || 3000;

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

// 确保目录存在
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MOVIES_DIR, { recursive: true });

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers
  });
  if (body !== undefined) res.end(body);
  else res.end();
}

function serveStatic(req, res) {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }
  const filePath = path.join(ROOT, reqPath);

  // 防止目录遍历
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      return send(res, 404, 'Not Found');
    }
    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      return fs.readFile(indexPath, (e, data) => {
        if (e) return send(res, 404, 'Not Found');
        const ext = path.extname(indexPath);
        send(res, 200, data, { 'Content-Type': MIME_MAP[ext] || 'text/plain' });
      });
    }
    fs.readFile(filePath, (e, data) => {
      if (e) return send(res, 500, 'Internal Error');
      const ext = path.extname(filePath);
      send(res, 200, data, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
    });
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        const json = raw ? JSON.parse(raw) : null;
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // 预检请求
  if (req.method === 'OPTIONS') {
    return send(res, 204);
  }

  // 注入前端环境变量
  if (req.method === 'GET' && req.url === '/env.js') {
    const script = `window.TMDB_TOKEN = ${JSON.stringify(TMDB_TOKEN)};`;
    return send(res, 200, script, { 'Content-Type': 'application/javascript; charset=utf-8' });
  }

  // 写入接口：/sync/upcoming
  if (req.method === 'POST' && req.url === '/sync/upcoming') {
    try {
      const body = await readJsonBody(req);
      const target = path.join(DATA_DIR, 'upcoming.json');
      fs.writeFile(target, JSON.stringify(body, null, 2), 'utf8', (err) => {
        if (err) return send(res, 500, JSON.stringify({ ok: false, error: String(err) }), { 'Content-Type': 'application/json' });
        send(res, 200, JSON.stringify({ ok: true, path: '/data/upcoming.json' }), { 'Content-Type': 'application/json' });
      });
    } catch (e) {
      send(res, 400, JSON.stringify({ ok: false, error: 'Invalid JSON' }), { 'Content-Type': 'application/json' });
    }
    return;
  }

  // 写入接口：/sync/movie/:id
  if (req.method === 'POST' && req.url.startsWith('/sync/movie/')) {
    const id = req.url.replace('/sync/movie/', '').split('?')[0];
    if (!id) return send(res, 400, JSON.stringify({ ok: false, error: 'Missing id' }), { 'Content-Type': 'application/json' });
    try {
      const body = await readJsonBody(req);
      const target = path.join(MOVIES_DIR, `${id}.json`);
      fs.writeFile(target, JSON.stringify(body, null, 2), 'utf8', (err) => {
        if (err) return send(res, 500, JSON.stringify({ ok: false, error: String(err) }), { 'Content-Type': 'application/json' });
        send(res, 200, JSON.stringify({ ok: true, path: `/data/movies/${id}.json` }), { 'Content-Type': 'application/json' });
      });
    } catch (e) {
      send(res, 400, JSON.stringify({ ok: false, error: 'Invalid JSON' }), { 'Content-Type': 'application/json' });
    }
    return;
  }

  // 其余走静态托管
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Static content served from: ${ROOT}`);
});
