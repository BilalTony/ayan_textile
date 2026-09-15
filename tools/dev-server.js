/**
 * Local dev server — the site plus the /api functions, no Vercel account
 * needed. It mimics what Vercel gives a function: req.query, a parsed
 * req.body, and res.status().json().
 *
 *   node tools/dev-server.js [port]
 *
 * Reads .env.local if there is one.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try { process.loadEnvFile('.env.local'); } catch { /* optional */ }

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

const readBody = (req) => new Promise((resolve) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    if (!raw) return resolve(undefined);
    try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
  });
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let pathname = url.pathname;

  // The one rewrite vercel.json declares.
  const img = /^\/img\/([^/]+)$/.exec(pathname);
  if (img) {
    pathname = '/api/images';
    url.searchParams.set('id', img[1]);
  }

  if (pathname.startsWith('/api/')) {
    const file = path.join(root, pathname + '.js');
    if (!fs.existsSync(file)) return send(res, 404, 'No such function\n');

    req.query = Object.fromEntries(url.searchParams);
    req.body = await readBody(req);

    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); return res; };

    const { default: handler } = await import(file + '?v=' + Date.now()); // always fresh
    try { await handler(req, res); } catch (err) { console.error(err); send(res, 500, 'Function threw\n'); }
    return;
  }

  // Static files, with vercel.json's cleanUrls: /login serves login.html.
  const candidates = [pathname, pathname + '.html', path.join(pathname, 'index.html')];
  for (const candidate of candidates) {
    const file = path.join(root, candidate);
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
      return fs.createReadStream(file).pipe(res);
    }
  }
  send(res, 404, 'Not found\n');
}).listen(port, () => console.log(`http://localhost:${port}`));

function send(res, code, text) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/plain');
  res.end(text);
}
