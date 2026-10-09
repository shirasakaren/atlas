#!/usr/bin/env node
/**
 * Serve apps/frontend/dist-demo the way GitHub Pages does: `/x` → `x.html`,
 * directories → index.html, anything else → 404.html with a 404 status.
 *
 *   node scripts/serve-demo.mjs [port]      (default 4173)
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist-demo');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

function resolveFile(urlPath) {
  const p = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const candidates = [p, `${p}.html`, join(p, 'index.html')];
  for (const c of candidates) {
    const f = join(root, c);
    if (!f.startsWith(root)) continue;
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let file = resolveFile(url.pathname === '/' ? 'index.html' : url.pathname);
  let status = 200;
  if (!file) {
    file = join(root, '404.html');
    status = 404;
  }
  res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`demo served at http://localhost:${port} (root ${root})`));
