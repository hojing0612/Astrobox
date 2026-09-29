// 로컬 개발 서버: 정적 파일 + /api/* 를 Vercel 함수처럼 실행. 사용: DATABASE_URL=... node dev.js
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const root = path.dirname(new URL(import.meta.url).pathname); const port = Number(process.env.PORT || 8092);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) { const name = u.pathname.slice(5).replace(/[^a-z_]/g, ''); try { const mod = await import(pathToFileURL(path.join(root, 'api', name + '.js')).href + '?t=' + Date.now()); res.statusCode = 200; await mod.default(req, res); } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e.message) })); console.error(e); } return; }
  let f = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname); if (!f.startsWith(root)) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (err, data) => { if (err) { res.statusCode = 404; return res.end('not found'); } res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); res.setHeader('cache-control', 'no-store'); res.end(data); });
}).listen(port, () => console.log('dev http://localhost:' + port));
